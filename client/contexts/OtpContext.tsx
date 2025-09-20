import React, { createContext, useContext, useState, useCallback } from "react";
import { useAppDispatch } from "../store/hooks";
import { setCredentials } from "../store/slices/authSlice";
import {
  useVerifyOTPLoginMutation,
  useVerifyRegistrationOTPMutation,
  useRequestOTPLoginMutation,
  useResendRegistrationOTPMutation,
} from "../store/api/authApi";
import {
  useVerifyGuestOtpMutation,
  useResendGuestOtpMutation,
} from "../store/api/guestApi";
import OtpDialog from "../components/OtpDialog";
import { useToast } from "../hooks/use-toast";

export interface OtpFlowConfig {
  context: "login" | "register" | "guestComplaint" | "complaintAuth";
  email: string;
  complaintId?: string;
  title?: string;
  description?: string;
  onSuccess?: (data: { token: string; user: any }) => void;
  onCancel?: () => void;
}

interface OtpContextValue {
  openOtpFlow: (config: OtpFlowConfig) => void;
  closeOtpFlow: () => void;
  isOpen: boolean;
}

// Default context value to prevent null errors
const defaultOtpContextValue: OtpContextValue = {
  openOtpFlow: () => {
    console.warn("OTP flow called outside OtpProvider");
  },
  closeOtpFlow: () => {
    console.warn("OTP close called outside OtpProvider");
  },
  isOpen: false,
};

const OtpContext = createContext<OtpContextValue>(defaultOtpContextValue);

export const useOtpFlow = () => {
  const context = useContext(OtpContext);
  if (!context) {
    console.warn("useOtpFlow called outside OtpProvider, using defaults");
    return defaultOtpContextValue;
  }
  return context;
};

export const OtpProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const dispatch = useAppDispatch();
  const { toast } = useToast();
  const [config, setConfig] = useState<OtpFlowConfig | null>(null);
  const [isOpen, setIsOpen] = useState(false);

  // API hooks with error boundaries
  const [verifyLoginOtp] = useVerifyOTPLoginMutation();
  const [verifyRegisterOtp] = useVerifyRegistrationOTPMutation();
  const [resendLoginOtp] = useRequestOTPLoginMutation();
  const [resendRegisterOtp] = useResendRegistrationOTPMutation();
  const [verifyGuestOtp] = useVerifyGuestOtpMutation();
  const [resendGuestOtp] = useResendGuestOtpMutation();

  const openOtpFlow = useCallback(
    (flowConfig: OtpFlowConfig) => {
      try {
        setConfig(flowConfig);
        setIsOpen(true);
      } catch (error) {
        console.error("Failed to open OTP flow:", error);
        toast({
          title: "Error",
          description: "Failed to open verification dialog",
          variant: "destructive",
        });
      }
    },
    [toast],
  );

  const closeOtpFlow = useCallback(() => {
    try {
      setIsOpen(false);
      if (config?.onCancel) {
        config.onCancel();
      }
      setConfig(null);
    } catch (error) {
      console.error("Failed to close OTP flow:", error);
      // Still try to close the dialog
      setIsOpen(false);
      setConfig(null);
    }
  }, [config]);

  const handleVerified = useCallback(
    async (data: { token: string; user: any; otpCode?: string }) => {
      if (!config || !data.otpCode) return;

      try {
        let result: any;

        switch (config.context) {
          case "login":
            result = await verifyLoginOtp({
              email: config.email,
              otpCode: data.otpCode,
            }).unwrap();
            break;

          case "register":
            result = await verifyRegisterOtp({
              email: config.email,
              otpCode: data.otpCode,
            }).unwrap();
            break;

          case "guestComplaint":
            if (!config.complaintId) {
              toast({
                title: "Error",
                description: "Complaint ID is required for guest verification",
                variant: "destructive",
              });
              return;
            }
            result = await verifyGuestOtp({
              email: config.email,
              otpCode: data.otpCode,
              complaintId: config.complaintId,
              createAccount: true,
            }).unwrap();
            break;

          case "complaintAuth":
            // Handle complaint auth verification
            // This might use a different API endpoint
            result = await verifyLoginOtp({
              email: config.email,
              otpCode: data.otpCode,
            }).unwrap();
            break;

          default:
            toast({
              title: "Error",
              description: "Invalid OTP context",
              variant: "destructive",
            });
            return;
        }

        // Store credentials if we have a token
        if (result.data?.token && result.data?.user) {
          dispatch(
            setCredentials({
              token: result.data.token,
              user: result.data.user,
            }),
          );

          localStorage.setItem("token", result.data.token);
        }

        // Call success callback
        if (config.onSuccess) {
          config.onSuccess(result.data);
        }

        // Show success message
        const contextMessages = {
          login: "Successfully logged in!",
          register: "Account created successfully!",
          guestComplaint: "Complaint verified and account created!",
          complaintAuth: "Access verified!",
        };

        toast({
          title: "Success",
          description: contextMessages[config.context],
        });

        // Close dialog
        setIsOpen(false);
        setConfig(null);
      } catch (error: any) {
        // Error will be handled by the mutation and shown in the dialog
        console.error("OTP verification failed:", error);
      }
    },
    [
      config,
      dispatch,
      verifyLoginOtp,
      verifyRegisterOtp,
      verifyGuestOtp,
      toast,
    ],
  );

  const handleResend = useCallback(async () => {
    if (!config) return;

    try {
      switch (config.context) {
        case "login":
        case "complaintAuth":
          await resendLoginOtp({ email: config.email }).unwrap();
          break;

        case "register":
          await resendRegisterOtp({ email: config.email }).unwrap();
          break;

        case "guestComplaint":
          if (config.complaintId) {
            await resendGuestOtp({
              email: config.email,
              complaintId: config.complaintId,
            }).unwrap();
          }
          break;
      }

      toast({
        title: "OTP Resent",
        description: "A new verification code has been sent to your email.",
      });
    } catch (error: any) {
      toast({
        title: "Failed to Resend",
        description: error.message || "Failed to resend OTP. Please try again.",
        variant: "destructive",
      });
    }
  }, [config, resendLoginOtp, resendRegisterOtp, resendGuestOtp, toast]);

  const contextValue: OtpContextValue = {
    openOtpFlow,
    closeOtpFlow,
    isOpen,
  };

  return (
    <OtpContext.Provider value={contextValue}>
      {children}
      {config && (
        <OtpDialog
          open={isOpen}
          onOpenChange={setIsOpen}
          context={config.context}
          email={config.email}
          complaintId={config.complaintId}
          title={config.title}
          description={config.description}
          onVerified={handleVerified}
          onResend={handleResend}
          // These will be managed by the mutations
          isVerifying={false}
          isResending={false}
          error={null}
        />
      )}
    </OtpContext.Provider>
  );
};

export default OtpProvider;
