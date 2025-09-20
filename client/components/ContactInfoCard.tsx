import React from "react";
import { useAppSelector } from "../store/hooks";
import { useSystemConfig } from "../contexts/SystemConfigContext";
import { Card, CardHeader, CardTitle, CardContent } from "./ui/card";
import { Phone, Mail, Clock, MapPin } from "lucide-react";

interface ContactInfoCardProps {
  title?: string;
}

const ContactInfoCard: React.FC<ContactInfoCardProps> = ({ title }) => {
  const { translations } = useAppSelector((s) => s.language);
  const { getConfig } = useSystemConfig();

  const headerTitle =
    title || translations?.guest?.supportContact || "Need Help? Contact Us";

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <Phone className="h-5 w-5 text-green-500" />
          <span>{headerTitle}</span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="flex items-center space-x-3">
            <Phone className="h-5 w-5 text-green-500 flex-shrink-0" />
            <div>
              <div className="font-medium">
                {translations?.guest?.supportContact || "Helpline"}
              </div>
              <div className="text-sm text-gray-600">
                {getConfig("CONTACT_HELPLINE", "1800-XXX-XXXX")}
              </div>
            </div>
          </div>
          <div className="flex items-center space-x-3">
            <Mail className="h-5 w-5 text-blue-500 flex-shrink-0" />
            <div>
              <div className="font-medium">
                {translations?.auth?.email || "Email Support"}
              </div>
              <div className="text-sm text-gray-600">
                {getConfig("CONTACT_EMAIL", "support@cochinsmartcity.in")}
              </div>
            </div>
          </div>
          <div className="flex items-center space-x-3">
            <Clock className="h-5 w-5 text-orange-500 flex-shrink-0" />
            <div>
              <div className="font-medium">
                {translations?.common?.time || "Office Hours"}
              </div>
              <div className="text-sm text-gray-600">
                {getConfig(
                  "CONTACT_OFFICE_HOURS",
                  "Monday - Friday: 9 AM - 6 PM",
                )}
              </div>
            </div>
          </div>
          <div className="flex items-center space-x-3">
            <MapPin className="h-5 w-5 text-purple-500 flex-shrink-0" />
            <div>
              <div className="font-medium">
                {translations?.complaints?.location || "Office Location"}
              </div>
              <div className="text-sm text-gray-600">
                {getConfig(
                  "CONTACT_OFFICE_ADDRESS",
                  "Cochin Corporation Office",
                )}
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default ContactInfoCard;
