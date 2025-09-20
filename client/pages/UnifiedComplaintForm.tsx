import React, { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useAppSelector, useAppDispatch } from "../store/hooks";
import { useComplaintTypes } from "../hooks/useComplaintTypes";
import {
  selectAuth,
  getDashboardRouteForRole,
  setCredentials,
} from "../store/slices/authSlice";
import { useCreateComplaintMutation } from "../store/api/complaintsApi";
import {
  selectGuestState,
  submitGuestComplaint,
  clearGuestData,
  updateFormData as updateGuestFormData,
  validateCurrentStep,
  setCurrentStep,
  nextStep,
  prevStep,
  addAttachment,
  removeAttachment,
  setImagePreview,
  selectFormData,
  selectCurrentStep,
  selectSteps,
  selectValidationErrors,
  selectCanProceed,
  selectIsSubmitting,
  selectComplaintId,
  selectSessionId,
  selectTrackingNumber,
  selectImagePreview,
  FileAttachment,
  GuestComplaintData,
  setOtpSession,
} from "../store/slices/guestSlice";
import {
  useGetWardsQuery,
  useVerifyGuestOtpMutation,
  useSubmitGuestComplaintMutation,
  useResendGuestOtpMutation,
} from "../store/api/guestApi";
import { useOtpFlow } from "../contexts/OtpContext";
import OtpDialog from "../components/OtpDialog";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "../components/ui/card";
import { Textarea } from "../components/ui/textarea";
import SimpleLocationMapDialog from "../components/SimpleLocationMapDialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../components/ui/select";
import { Alert, AlertDescription } from "../components/ui/alert";
import { Badge } from "../components/ui/badge";
import { Progress } from "../components/ui/progress";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "../components/ui/dialog";
import {
  FileText,
  Mail,
  CheckCircle,
  Clock,
  User,
  MapPin,
  ArrowLeft,
  ArrowRight,
  Loader2,
  UserPlus,
  Shield,
  Camera,
  Upload,
  X,
  Eye,
  AlertCircle,
  MapIcon,
  FileImage,
  Check,
  UserCheck,
  Info,
} from "lucide-react";
import { useToast } from "../hooks/use-toast";
import { useSystemConfig } from "../contexts/SystemConfigContext";
import { prewarmMapAssets } from "../utils/mapTilePrefetch";

const COMPLAINT_TYPES = [
  {
    value: "WATER_SUPPLY",
    label: "Water Supply",
    description: "Issues with water supply, quality, or pressure",
  },
  {
    value: "ELECTRICITY",
    label: "Electricity",
    description: "Power outages, faulty connections, or street lighting",
  },
  {
    value: "ROAD_REPAIR",
    label: "Road Repair",
    description: "Potholes, broken roads, or pedestrian issues",
  },
  {
    value: "GARBAGE_COLLECTION",
    label: "Garbage Collection",
    description: "Waste management and cleanliness issues",
  },
  {
    value: "STREET_LIGHTING",
    label: "Street Lighting",
    description: "Non-functioning or damaged street lights",
  },
  {
    value: "SEWERAGE",
    label: "Sewerage",
    description: "Drainage problems, blockages, or overflow",
  },
  {
    value: "PUBLIC_HEALTH",
    label: "Public Health",
    description: "Health and sanitation concerns",
  },
  {
    value: "TRAFFIC",
    label: "Traffic",
    description: "Traffic management and road safety issues",
  },
  {
    value: "OTHERS",
    label: "Others",
    description: "Any other civic issues not listed above",
  },
];

const PRIORITIES = [
  {
    value: "LOW",
    label: "Low",
    color: "bg-gray-500",
    description: "Non-urgent issues",
  },
  {
    value: "MEDIUM",
    label: "Medium",
    color: "bg-blue-500",
    description: "Standard issues requiring attention",
  },
  {
    value: "HIGH",
    label: "High",
    color: "bg-orange-500",
    description: "Important issues affecting daily life",
  },
  {
    value: "CRITICAL",
    label: "Critical",
    color: "bg-red-500",
    description: "Emergency situations requiring immediate attention",
  },
];

const UnifiedComplaintForm: React.FC = () => {
  const navigate = useNavigate();

  // RTK Query mutations
  const [createComplaintMutation] = useCreateComplaintMutation();
  const dispatch = useAppDispatch();
  const { toast } = useToast();
  const { openOtpFlow } = useOtpFlow();
  const { getConfig } = useSystemConfig();
  const [verifyGuestOtp] = useVerifyGuestOtpMutation();
  const [submitGuestComplaintMutation, { isLoading: isSendingOtp }] =
    useSubmitGuestComplaintMutation();
  const [resendGuestOtp] = useResendGuestOtpMutation();
  const { isAuthenticated, user } = useAppSelector(selectAuth);

  // Fetch wards from API
  const {
    data: wardsResponse,
    isLoading: wardsLoading,
    error: wardsError,
  } = useGetWardsQuery();
  const wards = Array.isArray(wardsResponse?.data) ? wardsResponse.data : [];

  // Use guest form state as the canonical source for form management
  const currentStep = useAppSelector(selectCurrentStep);
  const steps = useAppSelector(selectSteps);
  const formData = useAppSelector(selectFormData);
  const validationErrors = useAppSelector(selectValidationErrors);
  const canProceed = useAppSelector(selectCanProceed);
  const isSubmitting = useAppSelector(selectIsSubmitting);
  const complaintId = useAppSelector(selectComplaintId);
  const sessionId = useAppSelector(selectSessionId);
  const trackingNumber = useAppSelector(selectTrackingNumber);
  const imagePreview = useAppSelector(selectImagePreview);

  // Local state for file handling and location
  const [currentLocation, setCurrentLocation] = useState<{
    lat: number;
    lng: number;
  } | null>(null);
  const [fileMap, setFileMap] = useState<Map<string, File>>(new Map());
  const [submissionMode, setSubmissionMode] = useState<"citizen" | "guest">(
    isAuthenticated ? "citizen" : "guest",
  );
  const [isMapDialogOpen, setIsMapDialogOpen] = useState(false);

  // OTP state
  const [otpCode, setOtpCode] = useState("");
  const [showOtpDialog, setShowOtpDialog] = useState(false);
  const [isVerifyingOtp, setIsVerifyingOtp] = useState(false);

  // Prefill form data for authenticated users
  useEffect(() => {
    if (isAuthenticated && user) {
      setSubmissionMode("citizen");

      // Pre-fill user data for citizen mode
      dispatch(
        updateGuestFormData({
          fullName: user.fullName,
          email: user.email,
          phoneNumber: user.phoneNumber || "",
          wardId: user.wardId || "",
        }),
      );
    } else {
      setSubmissionMode("guest");
    }
  }, [isAuthenticated, user, dispatch]);

  // Prewarm map assets (tiles + leaflet) using system-config default center
  useEffect(() => {
    const lat = parseFloat(getConfig("MAP_DEFAULT_LAT", "9.9312")) || 9.9312;
    const lng = parseFloat(getConfig("MAP_DEFAULT_LNG", "76.2673")) || 76.2673;
    prewarmMapAssets(lat, lng, 13);
  }, [getConfig]);
c  // Get current location
  useEffect(() => {
    if ("geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const coords = {
            lat: position.coords.latitude,
            lng: position.coords.longitude,
          };
          setCurrentLocation(coords);
          dispatch(
            updateGuestFormData({
              coordinates: {
                latitude: coords.lat,
                longitude: coords.lng,
              },
            }),
          );
        },
        (error) => {
          console.log("Location access denied or unavailable");
        },
      );
    }
  }, [dispatch]);

  // Handle input changes
  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      const { name, value } = e.target;
      dispatch(updateGuestFormData({ [name]: value }));
    },
    [dispatch],
  );

  // Handle select changes
  const handleSelectChange = useCallback(
    (name: string, value: string) => {
      dispatch(updateGuestFormData({ [name]: value }));
    },
    [dispatch],
  );

  // Handle location selection from map
  const handleLocationSelect = useCallback(
    (location: {
      latitude: number;
      longitude: number;
      address?: string;
      area?: string;
      landmark?: string;
    }) => {
      dispatch(
        updateGuestFormData({
          landmark: location.landmark || location.address || "",
          area: location.area || formData.area,
          address: location.address || formData.address,
          coordinates: {
            latitude: location.latitude,
            longitude: location.longitude,
          },
        }),
      );
    },
    [dispatch, formData.area, formData.address],
  );

  // Handle file upload
  const handleFileUpload = useCallback(
    (files: FileList | null) => {
      if (!files) return;

      Array.from(files).forEach((file) => {
        // Validate file
        if (file.size > 10 * 1024 * 1024) {
          toast({
            title: "File too large",
            description: "Please select files smaller than 10MB",
            variant: "destructive",
          });
          return;
        }

        if (!["image/jpeg", "image/png", "image/jpg"].includes(file.type)) {
          toast({
            title: "Invalid file type",
            description: "Only JPG and PNG images are allowed",
            variant: "destructive",
          });
          return;
        }

        // Create attachment object with serializable data
        const attachmentId =
          Date.now().toString() + Math.random().toString(36).substr(2, 9);
        const attachment = {
          id: attachmentId,
          name: file.name,
          size: file.size,
          type: file.type,
          preview: URL.createObjectURL(file),
          uploading: false,
          uploaded: false,
        };

        // Store the actual file separately
        setFileMap((prev) => new Map(prev).set(attachmentId, file));
        dispatch(addAttachment(attachment));
      });
    },
    [dispatch, toast],
  );

  // Handle attachment removal
  const handleRemoveAttachment = useCallback(
    (id: string) => {
      setFileMap((prev) => {
        const newMap = new Map(prev);
        newMap.delete(id);
        return newMap;
      });
      dispatch(removeAttachment(id));
    },
    [dispatch],
  );

  // Handle image preview
  const handlePreviewImage = useCallback(
    (url: string) => {
      dispatch(setImagePreview({ show: true, url }));
    },
    [dispatch],
  );

  // Handle OTP input change
  const handleOtpChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const value = e.target.value.replace(/\D/g, "").slice(0, 6);
      setOtpCode(value);

      // Clear OTP validation error when user starts typing
      if (validationErrors.otpCode) {
        dispatch(updateGuestFormData({})); // Trigger validation update
      }
    },
    [dispatch, validationErrors.otpCode],
  );

  // Handle OTP resend
  const handleResendOtp = useCallback(async () => {
    if (!formData.email) return;

    try {
      await resendGuestOtp({ email: formData.email }).unwrap();

      toast({
        title: "Verification Code Resent",
        description: "A new verification code has been sent to your email.",
      });
    } catch (error: any) {
      toast({
        title: "Failed to Resend",
        description:
          error.message ||
          "Failed to resend verification code. Please try again.",
        variant: "destructive",
      });
    }
  }, [dispatch, complaintId, formData.email, toast]);

  // Handle form navigation
  const handleNext = useCallback(() => {
    dispatch(validateCurrentStep());
    if (canProceed) {
      dispatch(nextStep());
    } else {
      toast({
        title: "Please complete required fields",
        description: "Fill in all required information before proceeding",
        variant: "destructive",
      });
    }
  }, [dispatch, canProceed, toast]);

  const handlePrev = useCallback(() => {
    dispatch(prevStep());
  }, [dispatch]);

  const handleStepClick = useCallback(
    (stepNumber: number) => {
      if (stepNumber <= currentStep) {
        dispatch(setCurrentStep(stepNumber));
      }
    },
    [dispatch, currentStep],
  );

  // Handle initial complaint submission (step 5 - send OTP)
  const handleSendOtp = useCallback(async () => {
    dispatch(validateCurrentStep());

    // Final validation of all previous steps
    const hasErrors = Object.keys(validationErrors).length > 0;
    if (hasErrors) {
      toast({
        title: "Please fix validation errors",
        description: "Complete all required fields correctly before submitting",
        variant: "destructive",
      });
      return;
    }

    try {
      if (submissionMode === "citizen" && isAuthenticated) {
        // Citizen flow: Submit directly to authenticated API
        const complaintData = {
          title: `${COMPLAINT_TYPES.find((t) => t.value === formData.type)?.label} - ${formData.area}`,
          description: formData.description,
          type: formData.type as any,
          priority: formData.priority as any,
          wardId: formData.wardId,
          subZoneId: formData.subZoneId,
          area: formData.area,
          landmark: formData.landmark,
          address: formData.address,
          coordinates: formData.coordinates,
          contactName: formData.fullName,
          contactEmail: formData.email,
          contactPhone: formData.phoneNumber,
          isAnonymous: false,
        };

        const result = await createComplaintMutation(complaintData).unwrap();

        toast({
          title: "Complaint Submitted Successfully!",
          description: `Your complaint has been registered with ID: ${result.complaintId}. You can track its progress from your dashboard.`,
        });

        // Clear form and navigate to dashboard
        dispatch(clearGuestData());
        navigate(getDashboardRouteForRole(user?.role || "CITIZEN"));
      } else {
        // Guest flow: Send OTP first (no attachments here)
        const submissionData = new FormData();
        submissionData.append("fullName", formData.fullName);
        submissionData.append("email", formData.email);
        submissionData.append("phoneNumber", formData.phoneNumber);
        if (formData.captchaId)
          submissionData.append("captchaId", formData.captchaId);
        if (formData.captchaText)
          submissionData.append("captchaText", formData.captchaText);

        const response =
          await submitGuestComplaintMutation(submissionData).unwrap();
        const result: any = response.data;

        if (result?.sessionId) {
          dispatch(
            setOtpSession({
              sessionId: result.sessionId,
              email: result.email,
              expiresAt: result.expiresAt,
            }),
          );
          setShowOtpDialog(true);
          toast({
            title: "Verification Code Sent",
            description: `A verification code has been sent to ${formData.email}. Please check your email and enter the code below.`,
          });
        }
      }
    } catch (error: any) {
      console.error("Complaint submission error:", error);
      toast({
        title: "Submission Failed",
        description:
          error.message || "Failed to submit complaint. Please try again.",
        variant: "destructive",
      });
    }
  }, [
    dispatch,
    formData,
    validationErrors,
    submissionMode,
    isAuthenticated,
    user,
    fileMap,
    toast,
    navigate,
  ]);

  // Handle OTP verification and final submission
  const handleVerifyAndSubmit = useCallback(async () => {
    if (!otpCode || otpCode.length !== 6) {
      toast({
        title: "Invalid Code",
        description: "Please enter a valid 6-digit verification code.",
        variant: "destructive",
      });
      return;
    }

    if (!sessionId) {
      toast({
        title: "Error",
        description: "Verification session not found. Please resend the code.",
        variant: "destructive",
      });
      return;
    }

    try {
      // Use RTK Query mutation for OTP verification (send full complaint data now)
      const fd = new FormData();
      fd.append("email", formData.email);
      fd.append("otpCode", otpCode);
      fd.append("fullName", formData.fullName);
      fd.append("phoneNumber", formData.phoneNumber);
      fd.append("type", formData.type);
      fd.append("description", formData.description);
      fd.append("priority", (formData.priority as any) || "MEDIUM");
      fd.append("wardId", formData.wardId);
      if (formData.subZoneId) fd.append("subZoneId", formData.subZoneId);
      fd.append("area", formData.area);
      if (formData.landmark) fd.append("landmark", formData.landmark);
      if (formData.address) fd.append("address", formData.address);
      if (formData.coordinates)
        fd.append("coordinates", JSON.stringify(formData.coordinates));
      // Attach files
      const filesToSend: FileAttachment[] =
        formData.attachments
          ?.map((a) => {
            const f = fileMap.get(a.id);
            return f ? { id: a.id, file: f } : null;
          })
          .filter((f): f is FileAttachment => f !== null) || [];
      for (const fa of filesToSend) fd.append("attachments", fa.file);

      const result = await verifyGuestOtp(fd).unwrap();

      // Store auth token and user data
      if (result.data?.token && result.data?.user) {
        dispatch(
          setCredentials({
            token: result.data.token,
            user: result.data.user,
          }),
        );
        localStorage.setItem("token", result.data.token);
      }

      toast({
        title: "Success!",
        description: result.data?.isNewUser
          ? "Your complaint has been verified and your citizen account has been created successfully!"
          : "Your complaint has been verified and you've been logged in successfully!",
      });

      // Clear form data and navigate to dashboard
      dispatch(clearGuestData());
      navigate("/dashboard");
    } catch (error: any) {
      console.error("OTP verification error:", error);
      toast({
        title: "Verification Failed",
        description:
          error?.data?.message ||
          error?.message ||
          "Invalid verification code. Please try again.",
        variant: "destructive",
      });
    }
  }, [
    otpCode,
    sessionId,
    formData.email,
    verifyGuestOtp,
    dispatch,
    toast,
    navigate,
  ]);

  // Legacy handleSubmit for backward compatibility (now delegates to appropriate handler)
  const handleSubmit = useCallback(() => {
    if (currentStep === 5) {
      if (submissionMode === "citizen") {
        return handleSendOtp();
      } else if (!sessionId) {
        return handleSendOtp();
      } else {
        return handleVerifyAndSubmit();
      }
    }
    return handleSendOtp();
  }, [
    currentStep,
    submissionMode,
    sessionId,
    handleSendOtp,
    handleVerifyAndSubmit,
  ]);

  // Calculate progress
  const progress = ((currentStep - 1) / (steps.length - 1)) * 100;

  // Get available sub-zones based on selected ward
  const selectedWard = wards.find((ward) => ward.id === formData.wardId);
  const availableSubZones = selectedWard?.subZones || [];

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 py-8 px-4">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="text-center space-y-2">
          <h1 className="text-3xl font-bold text-gray-900">
            Submit a Complaint
          </h1>
          <p className="text-gray-600">
            {submissionMode === "citizen"
              ? "Report civic issues using your citizen account"
              : "Report civic issues and get them resolved quickly"}
          </p>
        </div>

        {/* User Status Alert */}
        {submissionMode === "citizen" && user ? (
          <Alert className="border-blue-200 bg-blue-50">
            <UserCheck className="h-4 w-4" />
            <AlertDescription className="text-blue-800">
              <strong>Logged in as:</strong> {user.fullName} ({user.email})
              <br />
              Your personal information is automatically filled. This complaint
              will be linked to your citizen account.
            </AlertDescription>
          </Alert>
        ) : (
          <Alert className="border-green-200 bg-green-50">
            <UserPlus className="h-4 w-4" />
            <AlertDescription className="text-green-800">
              <strong>Guest Submission:</strong> After submitting, you'll
              receive an email with a verification code. Verifying will
              automatically create your citizen account for future use.
            </AlertDescription>
          </Alert>
        )}

        {/* Progress Indicator */}
        <Card>
          <CardContent className="pt-6">
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-semibold">Progress</h3>
                <span className="text-sm text-gray-500">
                  Step {currentStep} of {steps.length}
                </span>
              </div>
              <Progress value={progress} className="w-full" />

              {/* Step indicators */}
              <div className="flex justify-between">
                {steps.map((step, index) => (
                  <button
                    key={step.id}
                    onClick={() => handleStepClick(step.id)}
                    disabled={step.id > currentStep}
                    className={`flex flex-col items-center space-y-2 p-2 rounded-lg transition-colors ${
                      step.id === currentStep
                        ? "bg-blue-100 text-blue-800"
                        : step.isCompleted
                          ? "bg-green-100 text-green-800 cursor-pointer hover:bg-green-200"
                          : "text-gray-400 cursor-not-allowed"
                    }`}
                  >
                    <div
                      className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                        step.id === currentStep
                          ? "bg-blue-600 text-white"
                          : step.isCompleted
                            ? "bg-green-600 text-white"
                            : "bg-gray-300 text-gray-600"
                      }`}
                    >
                      {step.isCompleted ? (
                        <Check className="h-4 w-4" />
                      ) : (
                        step.id
                      )}
                    </div>
                    <span className="text-xs font-medium">{step.title}</span>
                  </button>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Form Content */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              {currentStep === 1 && <User className="h-5 w-5" />}
              {currentStep === 2 && <MapPin className="h-5 w-5" />}
              {currentStep === 3 && <Camera className="h-5 w-5" />}
              {currentStep === 4 && <CheckCircle className="h-5 w-5" />}
              {currentStep === 5 &&
                (submissionMode === "citizen" ? (
                  <Shield className="h-5 w-5" />
                ) : (
                  <Mail className="h-5 w-5" />
                ))}
              {steps[currentStep - 1]?.title}
            </CardTitle>
            <CardDescription>
              {currentStep === 1 &&
                "Provide your details and describe the issue"}
              {currentStep === 2 && "Specify the location of the problem"}
              {currentStep === 3 &&
                "Add images to help us understand the issue (optional)"}
              {currentStep === 4 && "Review all information before submitting"}
              {currentStep === 5 &&
                (submissionMode === "citizen"
                  ? "Submit your complaint to the authorities"
                  : "Verify your email and submit your complaint")}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Step 1: Details */}
            {currentStep === 1 && (
              <div className="space-y-6">
                {/* Personal Information */}
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold">
                    Personal Information
                  </h3>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="fullName">
                        Full Name <span className="text-red-500">*</span>
                      </Label>
                      <Input
                        id="fullName"
                        name="fullName"
                        placeholder="Enter your full name"
                        value={formData.fullName}
                        onChange={handleInputChange}
                        readOnly={submissionMode === "citizen"}
                        className={
                          submissionMode === "citizen"
                            ? "bg-gray-100"
                            : validationErrors.fullName
                              ? "border-red-500 focus:ring-red-500"
                              : ""
                        }
                        aria-describedby={
                          validationErrors.fullName
                            ? "fullName-error"
                            : undefined
                        }
                      />
                      {validationErrors.fullName && (
                        <p
                          id="fullName-error"
                          className="text-sm text-red-600"
                          role="alert"
                        >
                          {validationErrors.fullName}
                        </p>
                      )}
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="email">
                        Email Address <span className="text-red-500">*</span>
                      </Label>
                      <Input
                        id="email"
                        name="email"
                        type="email"
                        placeholder="Enter your email"
                        value={formData.email}
                        onChange={handleInputChange}
                        readOnly={submissionMode === "citizen"}
                        className={
                          submissionMode === "citizen"
                            ? "bg-gray-100"
                            : validationErrors.email
                              ? "border-red-500 focus:ring-red-500"
                              : ""
                        }
                        aria-describedby={
                          validationErrors.email ? "email-error" : undefined
                        }
                      />
                      {validationErrors.email && (
                        <p
                          id="email-error"
                          className="text-sm text-red-600"
                          role="alert"
                        >
                          {validationErrors.email}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="phoneNumber">
                      Phone Number <span className="text-red-500">*</span>
                    </Label>
                    <Input
                      id="phoneNumber"
                      name="phoneNumber"
                      type="tel"
                      placeholder="Enter your phone number"
                      value={formData.phoneNumber}
                      onChange={handleInputChange}
                      readOnly={submissionMode === "citizen"}
                      className={
                        submissionMode === "citizen"
                          ? "bg-gray-100"
                          : validationErrors.phoneNumber
                            ? "border-red-500 focus:ring-red-500"
                            : ""
                      }
                      aria-describedby={
                        validationErrors.phoneNumber
                          ? "phoneNumber-error"
                          : undefined
                      }
                    />
                    {validationErrors.phoneNumber && (
                      <p
                        id="phoneNumber-error"
                        className="text-sm text-red-600"
                        role="alert"
                      >
                        {validationErrors.phoneNumber}
                      </p>
                    )}
                  </div>

                  {submissionMode === "citizen" && (
                    <div className="bg-blue-50 p-3 rounded-lg text-sm text-blue-700">
                      <Info className="h-4 w-4 inline mr-2" />
                      These details are from your citizen account. To update
                      them, visit your profile settings.
                    </div>
                  )}
                </div>

                {/* Complaint Information */}
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold">
                    Complaint Information
                  </h3>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>
                        Complaint Type <span className="text-red-500">*</span>
                      </Label>
                      <Select
                        value={formData.type}
                        onValueChange={(value) =>
                          handleSelectChange("type", value)
                        }
                        aria-describedby={
                          validationErrors.type ? "type-error" : undefined
                        }
                      >
                        <SelectTrigger
                          className={
                            validationErrors.type
                              ? "border-red-500 focus:ring-red-500"
                              : ""
                          }
                        >
                          <SelectValue placeholder="Select complaint type" />
                        </SelectTrigger>
                        <SelectContent>
                          {COMPLAINT_TYPES.map((type) => (
                            <SelectItem key={type.value} value={type.value}>
                              <div className="flex flex-col">
                                <span className="font-medium">
                                  {type.label}
                                </span>
                                <span className="text-xs text-gray-500">
                                  {type.description}
                                </span>
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      {validationErrors.type && (
                        <p
                          id="type-error"
                          className="text-sm text-red-600"
                          role="alert"
                        >
                          {validationErrors.type}
                        </p>
                      )}
                    </div>

                    <div className="space-y-2">
                      <Label>Priority</Label>
                      <Select
                        value={formData.priority}
                        onValueChange={(value) =>
                          handleSelectChange("priority", value)
                        }
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {PRIORITIES.map((priority) => (
                            <SelectItem
                              key={priority.value}
                              value={priority.value}
                            >
                              <div className="flex items-center gap-2">
                                <div
                                  className={`w-2 h-2 rounded-full ${priority.color}`}
                                />
                                <div className="flex flex-col">
                                  <span className="font-medium">
                                    {priority.label}
                                  </span>
                                  <span className="text-xs text-gray-500">
                                    {priority.description}
                                  </span>
                                </div>
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="description">
                      Description <span className="text-red-500">*</span>
                    </Label>
                    <Textarea
                      id="description"
                      name="description"
                      placeholder="Describe the issue in detail..."
                      value={formData.description}
                      onChange={handleInputChange}
                      rows={4}
                      aria-describedby={
                        validationErrors.description
                          ? "description-error"
                          : undefined
                      }
                      className={
                        validationErrors.description
                          ? "border-red-500 focus:ring-red-500"
                          : ""
                      }
                    />
                    {validationErrors.description && (
                      <p
                        id="description-error"
                        className="text-sm text-red-600"
                        role="alert"
                      >
                        {validationErrors.description}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Step 2: Location */}
            {currentStep === 2 && (
              <div className="space-y-6">
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold">
                    Location Information
                  </h3>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>
                        Ward <span className="text-red-500">*</span>
                      </Label>
                      <Select
                        value={formData.wardId}
                        onValueChange={(value) =>
                          handleSelectChange("wardId", value)
                        }
                      >
                        <SelectTrigger
                          className={
                            validationErrors.wardId
                              ? "border-red-500 focus:ring-red-500"
                              : ""
                          }
                        >
                          <SelectValue placeholder="Select ward" />
                        </SelectTrigger>
                        <SelectContent>
                          {wardsLoading ? (
                            <SelectItem value="loading" disabled>
                              Loading wards...
                            </SelectItem>
                          ) : wardsError ? (
                            <SelectItem value="error" disabled>
                              Error loading wards
                            </SelectItem>
                          ) : (
                            wards.map((ward) => (
                              <SelectItem key={ward.id} value={ward.id}>
                                {ward.name}
                              </SelectItem>
                            ))
                          )}
                        </SelectContent>
                      </Select>
                      {validationErrors.wardId && (
                        <p className="text-sm text-red-600" role="alert">
                          {validationErrors.wardId}
                        </p>
                      )}
                    </div>

                    <div className="space-y-2">
                      <Label>Sub-Zone (Optional)</Label>
                      <Select
                        value={formData.subZoneId}
                        onValueChange={(value) =>
                          handleSelectChange("subZoneId", value)
                        }
                        disabled={!formData.wardId}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select sub-zone" />
                        </SelectTrigger>
                        <SelectContent>
                          {availableSubZones.length === 0 ? (
                            <SelectItem value="no-subzones" disabled>
                              No sub-zones available
                            </SelectItem>
                          ) : (
                            availableSubZones.map((subZone) => (
                              <SelectItem key={subZone.id} value={subZone.id}>
                                {subZone.name}
                              </SelectItem>
                            ))
                          )}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="area">
                      Area/Locality <span className="text-red-500">*</span>
                    </Label>
                    <Input
                      id="area"
                      name="area"
                      placeholder="Enter specific area or locality"
                      value={formData.area}
                      onChange={handleInputChange}
                      className={
                        validationErrors.area
                          ? "border-red-500 focus:ring-red-500"
                          : ""
                      }
                    />
                    {validationErrors.area && (
                      <p className="text-sm text-red-600" role="alert">
                        {validationErrors.area}
                      </p>
                    )}
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="landmark">
                        Landmark <span className="text-red-500">*</span>
                      </Label>
                      <div className="flex space-x-2">
                        <Input
                          id="landmark"
                          name="landmark"
                          placeholder="Nearby landmark"
                          value={formData.landmark}
                          onChange={handleInputChange}
                          className={`flex-1 ${validationErrors.landmark ? "border-red-500 focus:ring-red-500" : ""}`}
                        />
                        <Button
                          type="button"
                          variant="outline"
                          size="icon"
                          onClick={() => setIsMapDialogOpen(true)}
                          title="Select location on map"
                        >
                          <MapPin className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="address">
                        Full Address <span className="text-red-500">*</span>
                      </Label>
                      <Input
                        id="address"
                        name="address"
                        placeholder="Complete address"
                        value={formData.address}
                        onChange={handleInputChange}
                        className={
                          validationErrors.address
                            ? "border-red-500 focus:ring-red-500"
                            : ""
                        }
                      />
                      {validationErrors.address && (
                        <p className="text-sm text-red-600" role="alert">
                          {validationErrors.address}
                        </p>
                      )}
                    </div>
                  </div>

                  {currentLocation && (
                    <div className="bg-green-50 p-4 rounded-lg border border-green-200">
                      <div className="flex items-center gap-2 text-green-700">
                        <MapIcon className="h-4 w-4" />
                        <span className="text-sm font-medium">
                          Location detected: {currentLocation.lat.toFixed(6)},{" "}
                          {currentLocation.lng.toFixed(6)}
                        </span>
                      </div>
                    </div>
                  )}
                </div>
                {validationErrors.coordinates && (
                  <p className="text-sm text-red-600" role="alert">
                    {validationErrors.coordinates}
                  </p>
                )}
              </div>
            )}

            {/* Step 3: Attachments */}
            {currentStep === 3 && (
              <div className="space-y-6">
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold">
                    Upload Images (Optional)
                  </h3>
                  <p className="text-sm text-gray-600">
                    Upload images to help illustrate the issue. Maximum 5 files,
                    10MB each.
                  </p>

                  <div className="space-y-4">
                    <input
                      type="file"
                      multiple
                      accept="image/*"
                      onChange={(e) => handleFileUpload(e.target.files)}
                      className="hidden"
                      id="file-upload"
                    />
                    <Label
                      htmlFor="file-upload"
                      className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-gray-300 rounded-lg cursor-pointer bg-gray-50 hover:bg-gray-100"
                    >
                      <div className="flex flex-col items-center justify-center pt-5 pb-6">
                        <Upload className="w-8 h-8 mb-2 text-gray-500" />
                        <p className="mb-2 text-sm text-gray-500">
                          <span className="font-semibold">Click to upload</span>{" "}
                          or drag and drop
                        </p>
                        <p className="text-xs text-gray-500">
                          PNG, JPG or JPEG (MAX. 10MB each)
                        </p>
                      </div>
                    </Label>

                    {/* File previews */}
                    {formData.attachments &&
                      formData.attachments.length > 0 && (
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                          {formData.attachments.map((attachment) => (
                            <div
                              key={attachment.id}
                              className="relative group border rounded-lg overflow-hidden"
                            >
                              <img
                                src={attachment.preview}
                                alt="Preview"
                                className="w-full h-24 object-cover"
                              />
                              <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-50 transition-all duration-200 flex items-center justify-center">
                                <div className="opacity-0 group-hover:opacity-100 flex gap-2">
                                  <Button
                                    type="button"
                                    variant="secondary"
                                    size="sm"
                                    onClick={() =>
                                      handlePreviewImage(attachment.preview!)
                                    }
                                  >
                                    <Eye className="h-4 w-4" />
                                  </Button>
                                  <Button
                                    type="button"
                                    variant="destructive"
                                    size="sm"
                                    onClick={() =>
                                      handleRemoveAttachment(attachment.id)
                                    }
                                  >
                                    <X className="h-4 w-4" />
                                  </Button>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                  </div>
                </div>
              </div>
            )}

            {/* Step 4: Review */}
            {currentStep === 4 && (
              <div className="space-y-6">
                <h3 className="text-lg font-semibold">Review Your Complaint</h3>

                <div className="space-y-4">
                  {/* Personal Info Review */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-base">
                        Personal Information
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2">
                      <p>
                        <strong>Name:</strong> {formData.fullName}
                      </p>
                      <p>
                        <strong>Email:</strong> {formData.email}
                      </p>
                      <p>
                        <strong>Phone:</strong> {formData.phoneNumber}
                      </p>
                      {submissionMode === "citizen" && user && (
                        <p>
                          <strong>Citizen ID:</strong>{" "}
                          {user.id.slice(-8).toUpperCase()}
                        </p>
                      )}
                    </CardContent>
                  </Card>

                  {/* Complaint Info Review */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-base">
                        Complaint Details
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2">
                      <p>
                        <strong>Type:</strong>{" "}
                        {
                          COMPLAINT_TYPES.find(
                            (type) => type.value === formData.type,
                          )?.label
                        }
                      </p>
                      <p>
                        <strong>Priority:</strong>{" "}
                        <Badge
                          className={
                            PRIORITIES.find(
                              (p) => p.value === formData.priority,
                            )?.color
                          }
                        >
                          {
                            PRIORITIES.find(
                              (p) => p.value === formData.priority,
                            )?.label
                          }
                        </Badge>
                      </p>
                      <p>
                        <strong>Description:</strong> {formData.description}
                      </p>
                    </CardContent>
                  </Card>

                  {/* Location Review */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-base">Location</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2">
                      <p>
                        <strong>Ward:</strong>{" "}
                        {selectedWard?.name || formData.wardId}
                      </p>
                      <p>
                        <strong>Sub-Zone:</strong>{" "}
                        {availableSubZones.find(
                          (sz) => sz.id === formData.subZoneId,
                        )?.name ||
                          formData.subZoneId ||
                          "Not specified"}
                      </p>
                      <p>
                        <strong>Area:</strong> {formData.area}
                      </p>
                      {formData.landmark && (
                        <p>
                          <strong>Landmark:</strong> {formData.landmark}
                        </p>
                      )}
                      {formData.address && (
                        <p>
                          <strong>Address:</strong> {formData.address}
                        </p>
                      )}
                    </CardContent>
                  </Card>

                  {/* Attachments Review */}
                  {formData.attachments && formData.attachments.length > 0 && (
                    <Card>
                      <CardHeader>
                        <CardTitle className="text-base">Attachments</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="grid grid-cols-3 gap-2">
                          {formData.attachments.map((attachment) => (
                            <img
                              key={attachment.id}
                              src={attachment.preview}
                              alt="Attachment"
                              className="w-full h-20 object-cover rounded border cursor-pointer"
                              onClick={() =>
                                handlePreviewImage(attachment.preview!)
                              }
                            />
                          ))}
                        </div>
                      </CardContent>
                    </Card>
                  )}

                  {/* Submission Type Info */}
                  <Alert
                    className={
                      submissionMode === "citizen"
                        ? "border-blue-200 bg-blue-50"
                        : "border-green-200 bg-green-50"
                    }
                  >
                    <CheckCircle className="h-4 w-4" />
                    <AlertDescription
                      className={
                        submissionMode === "citizen"
                          ? "text-blue-800"
                          : "text-green-800"
                      }
                    >
                      {submissionMode === "citizen" ? (
                        <>
                          <strong>Citizen Submission:</strong> Your complaint
                          will be immediately registered and linked to your
                          account. You'll receive email notifications and can
                          track progress from your dashboard.
                        </>
                      ) : (
                        <>
                          <strong>Guest Submission:</strong> After submitting,
                          you'll receive a verification email. Verifying will
                          create your citizen account and activate your
                          complaint tracking.
                        </>
                      )}
                    </AlertDescription>
                  </Alert>
                </div>
              </div>
            )}

            {/* Step 5: Submit with OTP */}
            {currentStep === 5 && (
              <div className="space-y-6">
                <h3 className="text-lg font-semibold">Verify and Submit</h3>

                {submissionMode === "citizen" ? (
                  // Citizen users: Direct submission without OTP
                  <div className="space-y-4">
                    <Alert className="border-blue-200 bg-blue-50">
                      <Shield className="h-4 w-4" />
                      <AlertDescription className="text-blue-800">
                        <strong>Citizen Account Detected:</strong> As a verified
                        citizen, your complaint will be submitted immediately
                        without requiring additional verification.
                      </AlertDescription>
                    </Alert>

                    <div className="text-center py-8">
                      <CheckCircle className="mx-auto h-16 w-16 text-green-500 mb-4" />
                      <h4 className="text-lg font-semibold mb-2">
                        Ready to Submit
                      </h4>
                      <p className="text-gray-600 mb-6">
                        Your complaint is ready to be submitted to the relevant
                        authorities.
                      </p>
                    </div>
                  </div>
                ) : (
                  // Guest users: OTP verification required
                  <div className="space-y-4">
                    {!sessionId ? (
                      // Step 5a: Send OTP
                      <div className="space-y-4">
                        <Alert className="border-green-200 bg-green-50">
                          <Mail className="h-4 w-4" />
                          <AlertDescription className="text-green-800">
                            <strong>Email Verification Required:</strong> We'll
                            send a verification code to{" "}
                            <strong>{formData.email}</strong> to secure your
                            complaint submission and create your citizen
                            account.
                          </AlertDescription>
                        </Alert>

                        <div className="text-center py-8">
                          <Mail className="mx-auto h-16 w-16 text-blue-500 mb-4" />
                          <h4 className="text-lg font-semibold mb-2">
                            Send Verification Code
                          </h4>
                          <p className="text-gray-600 mb-6">
                            Click below to send a verification code to your
                            email address.
                          </p>
                        </div>
                      </div>
                    ) : (
                      // Step 5b: Enter OTP
                      <div className="space-y-4">
                        <Alert className="border-orange-200 bg-orange-50">
                          <Clock className="h-4 w-4" />
                          <AlertDescription className="text-orange-800">
                            <strong>Verification Code Sent:</strong> Please
                            check your email and enter the 6-digit verification
                            code below.
                          </AlertDescription>
                        </Alert>

                        <div className="max-w-md mx-auto space-y-4">
                          <div className="space-y-2">
                            <Label
                              htmlFor="otpCode"
                              className="text-center block"
                            >
                              Enter Verification Code
                            </Label>
                            <Input
                              id="otpCode"
                              name="otpCode"
                              type="text"
                              placeholder="Enter 6-digit code"
                              maxLength={6}
                              className="text-center text-xl font-mono tracking-widest"
                              value={otpCode}
                              onChange={handleOtpChange}
                              autoComplete="one-time-code"
                            />
                          </div>

                          <div className="flex justify-between items-center text-sm">
                            <span className="text-gray-500">
                              Code sent to: {formData.email}
                            </span>
                            <Button
                              type="button"
                              variant="link"
                              size="sm"
                              onClick={handleResendOtp}
                              disabled={isSubmitting}
                              className="text-blue-600 p-0"
                            >
                              Resend Code
                            </Button>
                          </div>

                          {validationErrors.otpCode && (
                            <p
                              className="text-sm text-red-600 text-center"
                              role="alert"
                            >
                              {validationErrors.otpCode}
                            </p>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Navigation Buttons */}
            <div className="flex justify-between pt-6">
              <Button
                type="button"
                variant="outline"
                onClick={handlePrev}
                disabled={currentStep === 1}
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Previous
              </Button>

              {currentStep < steps.length ? (
                <Button
                  type="button"
                  onClick={handleNext}
                  disabled={!canProceed}
                >
                  Next
                  <ArrowRight className="h-4 w-4 ml-2" />
                </Button>
              ) : (
                // Step 5 submission buttons
                <div className="flex gap-2">
                  {submissionMode === "citizen" ? (
                    // Citizen: Direct submit
                    <Button
                      type="button"
                      onClick={handleSendOtp}
                      disabled={isSubmitting}
                    >
                      {isSubmitting ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          Submitting...
                        </>
                      ) : (
                        <>
                          Submit Complaint
                          <CheckCircle className="h-4 w-4 ml-2" />
                        </>
                      )}
                    </Button>
                  ) : !sessionId ? (
                    // Guest: Send OTP first
                    <Button
                      type="button"
                      onClick={handleSendOtp}
                      disabled={isSendingOtp}
                    >
                      {isSendingOtp ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          Sending Code...
                        </>
                      ) : (
                        <>
                          Send Verification Code
                          <Mail className="h-4 w-4 ml-2" />
                        </>
                      )}
                    </Button>
                  ) : (
                    // Guest: Verify OTP via popup
                    <Button
                      type="button"
                      onClick={() => setShowOtpDialog(true)}
                    >
                      Verify & Submit
                      <CheckCircle className="h-4 w-4 ml-2" />
                    </Button>
                  )}
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* OTP Dialog */}
        {showOtpDialog && (
          <OtpDialog
            open={showOtpDialog}
            onOpenChange={setShowOtpDialog}
            context="guestComplaint"
            email={formData.email}
            onVerified={async ({ otpCode }) => {
              if (!otpCode) return;
              try {
                setIsVerifyingOtp(true);
                const fd = new FormData();
                fd.append("email", formData.email);
                fd.append("otpCode", otpCode);
                fd.append("fullName", formData.fullName);
                fd.append("phoneNumber", formData.phoneNumber);
                fd.append("type", formData.type);
                fd.append("description", formData.description);
                fd.append("priority", (formData.priority as any) || "MEDIUM");
                fd.append("wardId", formData.wardId);
                if (formData.subZoneId)
                  fd.append("subZoneId", formData.subZoneId);
                fd.append("area", formData.area);
                if (formData.landmark) fd.append("landmark", formData.landmark);
                if (formData.address) fd.append("address", formData.address);
                if (formData.coordinates)
                  fd.append(
                    "coordinates",
                    JSON.stringify(formData.coordinates),
                  );
                const filesToSend: FileAttachment[] =
                  formData.attachments
                    ?.map((a) => {
                      const f = fileMap.get(a.id);
                      return f ? { id: a.id, file: f } : null;
                    })
                    .filter((f): f is FileAttachment => f !== null) || [];
                for (const fa of filesToSend) fd.append("attachments", fa.file);

                const result = await verifyGuestOtp(fd).unwrap();
                if (result.data?.token && result.data?.user) {
                  dispatch(
                    setCredentials({
                      token: result.data.token,
                      user: result.data.user,
                    }),
                  );
                  localStorage.setItem("token", result.data.token);
                }
                toast({
                  title: "Success!",
                  description: result.data?.isNewUser
                    ? "Your complaint has been verified and your citizen account has been created successfully!"
                    : "Your complaint has been verified and you've been logged in successfully!",
                });
                dispatch(clearGuestData());
                setShowOtpDialog(false);
                navigate("/dashboard");
              } catch (error: any) {
                toast({
                  title: "Verification Failed",
                  description:
                    error?.data?.message ||
                    error?.message ||
                    "Invalid verification code. Please try again.",
                  variant: "destructive",
                });
              } finally {
                setIsVerifyingOtp(false);
              }
            }}
            onResend={async () => {
              try {
                await resendGuestOtp({ email: formData.email }).unwrap();
                toast({
                  title: "Verification Code Resent",
                  description:
                    "A new verification code has been sent to your email.",
                });
              } catch (error: any) {
                toast({
                  title: "Failed to Resend",
                  description:
                    error?.message || "Failed to resend verification code.",
                  variant: "destructive",
                });
              }
            }}
            isVerifying={isVerifyingOtp}
          />
        )}

        {/* Image Preview Dialog */}
        {imagePreview.show && (
          <Dialog
            open={imagePreview.show}
            onOpenChange={(open) =>
              dispatch(setImagePreview({ show: open, url: imagePreview.url }))
            }
          >
            <DialogContent className="max-w-3xl">
              <DialogHeader>
                <DialogTitle>Image Preview</DialogTitle>
              </DialogHeader>
              <div className="flex justify-center">
                <img
                  src={imagePreview.url!}
                  alt="Preview"
                  className="max-w-full max-h-96 object-contain"
                />
              </div>
            </DialogContent>
          </Dialog>
        )}

        {/* Location Map Dialog */}
        <SimpleLocationMapDialog
          isOpen={isMapDialogOpen}
          onClose={() => setIsMapDialogOpen(false)}
          onLocationSelect={handleLocationSelect}
          initialLocation={
            formData.coordinates
              ? {
                  latitude: formData.coordinates.latitude,
                  longitude: formData.coordinates.longitude,
                  address: formData.address,
                  area: formData.area,
                  landmark: formData.landmark,
                }
              : undefined
          }
        />
      </div>
    </div>
  );
};

export default UnifiedComplaintForm;
