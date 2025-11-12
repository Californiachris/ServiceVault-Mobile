import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Users, Phone, Mail, Briefcase, Award } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

const onboardingSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  companyName: z.string().min(2, "Company name is required"),
  licenseNumber: z.string().min(3, "License number is required"),
  phone: z.string().min(10, "Please enter a valid phone number"),
  serviceAreas: z.string().min(3, "Please enter at least one service area"),
  specialties: z.array(z.string()).min(1, "Please select at least one specialty"),
  crewSize: z.number().min(1).max(500),
  notificationPreference: z.enum(["EMAIL_ONLY", "SMS_ONLY", "EMAIL_AND_SMS", "NONE"]),
});

type OnboardingData = z.infer<typeof onboardingSchema>;

interface ContractorOnboardingFormProps {
  open: boolean;
  onClose: () => void;
  onComplete: (data: OnboardingData) => Promise<void>;
  userName?: string;
  userEmail?: string;
}

const SPECIALTIES = [
  { id: "hvac", label: "HVAC", icon: "🌡️" },
  { id: "plumbing", label: "Plumbing", icon: "🔧" },
  { id: "electrical", label: "Electrical", icon: "⚡" },
  { id: "roofing", label: "Roofing", icon: "🏠" },
  { id: "flooring", label: "Flooring", icon: "📐" },
  { id: "painting", label: "Painting", icon: "🎨" },
  { id: "carpentry", label: "Carpentry", icon: "🪚" },
  { id: "landscaping", label: "Landscaping", icon: "🌳" },
];

export function ContractorOnboardingForm({
  open,
  onClose,
  onComplete,
  userName,
  userEmail,
}: ContractorOnboardingFormProps) {
  const [step, setStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedSpecialties, setSelectedSpecialties] = useState<string[]>([]);

  const form = useForm<OnboardingData>({
    resolver: zodResolver(onboardingSchema),
    defaultValues: {
      name: userName || "",
      companyName: "",
      licenseNumber: "",
      phone: "",
      serviceAreas: "",
      specialties: [],
      crewSize: 1,
      notificationPreference: "EMAIL_AND_SMS",
    },
  });

  const toggleSpecialty = (specialtyId: string) => {
    const updated = selectedSpecialties.includes(specialtyId)
      ? selectedSpecialties.filter(s => s !== specialtyId)
      : [...selectedSpecialties, specialtyId];
    setSelectedSpecialties(updated);
    form.setValue("specialties", updated);
  };

  const onSubmit = async (data: OnboardingData) => {
    setIsSubmitting(true);
    try {
      await onComplete(data);
    } catch (error) {
      setIsSubmitting(false);
    }
  };

  const nextStep = async () => {
    const fields = step === 1 
      ? ["name", "companyName", "licenseNumber"] 
      : step === 2 
      ? ["phone", "serviceAreas", "specialties", "crewSize"]
      : ["notificationPreference"];
    
    const isValid = await form.trigger(fields as any);
    if (isValid) setStep(step + 1);
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[600px] p-0 gap-0 max-h-screen md:max-h-[90vh] flex flex-col" onInteractOutside={(e) => e.preventDefault()}>
        <DialogHeader className="px-6 pt-6 pb-4 bg-gradient-to-r from-orange-500 to-red-500 flex-shrink-0">
          <DialogTitle className="text-2xl text-white flex items-center gap-2">
            <Users className="h-6 w-6" />
            Welcome to FixTrack Pro
          </DialogTitle>
          <p className="text-white/90 text-sm mt-1">Let's set up your contractor account</p>
        </DialogHeader>

        {/* Progress Indicator */}
        <div className="px-6 py-4 bg-muted/30 flex-shrink-0">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium">Step {step} of 3</span>
            <span className="text-sm text-muted-foreground">
              {step === 1 ? "Company Info" : step === 2 ? "Services & Crew" : "Preferences"}
            </span>
          </div>
          <div className="h-2 bg-muted rounded-full overflow-hidden">
            <motion.div
              className="h-full bg-gradient-to-r from-orange-500 to-red-500"
              initial={{ width: "0%" }}
              animate={{ width: `${(step / 3) * 100}%` }}
              transition={{ duration: 0.3, ease: "easeOut" }}
            />
          </div>
        </div>

        <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col flex-1 min-h-0">
          <div className="px-6 py-6 overflow-y-auto flex-1">
            <AnimatePresence mode="wait">
              {step === 1 && (
                <motion.div
                  key="step1"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ duration: 0.3 }}
                  className="space-y-4"
                >
                <div className="space-y-2">
                  <Label htmlFor="name" className="flex items-center gap-2">
                    <Mail className="h-4 w-4 text-muted-foreground" />
                    Full Name
                  </Label>
                  <Input
                    id="name"
                    {...form.register("name")}
                    placeholder="John Doe"
                    className="h-11"
                    data-testid="input-contractor-name"
                  />
                  {form.formState.errors.name && (
                    <p className="text-sm text-destructive">{form.formState.errors.name.message}</p>
                  )}
                  {userEmail && (
                    <p className="text-xs text-muted-foreground">Account email: {userEmail}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="companyName" className="flex items-center gap-2">
                    <Briefcase className="h-4 w-4 text-muted-foreground" />
                    Company Name
                  </Label>
                  <Input
                    id="companyName"
                    {...form.register("companyName")}
                    placeholder="ABC Contracting LLC"
                    className="h-11"
                    data-testid="input-company-name"
                  />
                  {form.formState.errors.companyName && (
                    <p className="text-sm text-destructive">{form.formState.errors.companyName.message}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="licenseNumber" className="flex items-center gap-2">
                    <Award className="h-4 w-4 text-muted-foreground" />
                    License Number
                  </Label>
                  <Input
                    id="licenseNumber"
                    {...form.register("licenseNumber")}
                    placeholder="LIC-123456"
                    className="h-11"
                    data-testid="input-license-number"
                  />
                  {form.formState.errors.licenseNumber && (
                    <p className="text-sm text-destructive">{form.formState.errors.licenseNumber.message}</p>
                  )}
                  </div>
                </motion.div>
              )}

              {step === 2 && (
                <motion.div
                  key="step2"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ duration: 0.3 }}
                  className="space-y-4"
                >
                <div className="space-y-2">
                  <Label htmlFor="phone" className="flex items-center gap-2">
                    <Phone className="h-4 w-4 text-muted-foreground" />
                    Business Phone
                  </Label>
                  <Input
                    id="phone"
                    {...form.register("phone")}
                    placeholder="(555) 123-4567"
                    type="tel"
                    className="h-11"
                    data-testid="input-contractor-phone"
                  />
                  {form.formState.errors.phone && (
                    <p className="text-sm text-destructive">{form.formState.errors.phone.message}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="serviceAreas">Service Areas (cities/regions)</Label>
                  <Input
                    id="serviceAreas"
                    {...form.register("serviceAreas")}
                    placeholder="Austin, Round Rock, Georgetown"
                    className="h-11"
                    data-testid="input-service-areas"
                  />
                  {form.formState.errors.serviceAreas && (
                    <p className="text-sm text-destructive">{form.formState.errors.serviceAreas.message}</p>
                  )}
                </div>

                <div className="space-y-3">
                  <Label>Specialties (select all that apply)</Label>
                  <div className="grid grid-cols-2 gap-2">
                    {SPECIALTIES.map((specialty) => (
                      <div
                        key={specialty.id}
                        className={`flex items-center space-x-2 p-3 rounded-lg border transition-colors ${
                          selectedSpecialties.includes(specialty.id)
                            ? "border-primary bg-primary/5"
                            : "hover:bg-muted/50"
                        }`}
                      >
                        <Checkbox
                          checked={selectedSpecialties.includes(specialty.id)}
                          onCheckedChange={() => toggleSpecialty(specialty.id)}
                          data-testid={`checkbox-specialty-${specialty.id}`}
                        />
                        <Label className="cursor-pointer flex-1 flex items-center gap-2" onClick={() => toggleSpecialty(specialty.id)}>
                          <span>{specialty.icon}</span>
                          <span className="text-sm">{specialty.label}</span>
                        </Label>
                      </div>
                    ))}
                  </div>
                  {form.formState.errors.specialties && (
                    <p className="text-sm text-destructive">{form.formState.errors.specialties.message}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="crewSize">Crew Size (number of employees)</Label>
                  <Input
                    id="crewSize"
                    type="number"
                    min="1"
                    max="500"
                    {...form.register("crewSize", { valueAsNumber: true })}
                    className="h-11"
                    data-testid="input-crew-size"
                  />
                  </div>
                </motion.div>
              )}

              {step === 3 && (
                <motion.div
                  key="step3"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ duration: 0.3 }}
                  className="space-y-4"
                >
                <div className="space-y-3">
                  <Label>How would you like to receive job updates and reminders?</Label>
                  <RadioGroup
                    value={form.watch("notificationPreference")}
                    onValueChange={(value: any) => form.setValue("notificationPreference", value)}
                    className="space-y-2"
                  >
                    <div className="flex items-center space-x-2 p-3 rounded-lg border hover:bg-muted/50 cursor-pointer">
                      <RadioGroupItem value="EMAIL_AND_SMS" id="both" data-testid="radio-contractor-notif-both" />
                      <Label htmlFor="both" className="cursor-pointer flex-1">
                        <div className="font-medium">Email & SMS</div>
                        <div className="text-xs text-muted-foreground">Stay updated via both channels (recommended)</div>
                      </Label>
                    </div>
                    <div className="flex items-center space-x-2 p-3 rounded-lg border hover:bg-muted/50 cursor-pointer">
                      <RadioGroupItem value="EMAIL_ONLY" id="email" data-testid="radio-contractor-notif-email" />
                      <Label htmlFor="email" className="cursor-pointer flex-1">
                        <div className="font-medium">Email Only</div>
                        <div className="text-xs text-muted-foreground">Receive updates via email</div>
                      </Label>
                    </div>
                    <div className="flex items-center space-x-2 p-3 rounded-lg border hover:bg-muted/50 cursor-pointer">
                      <RadioGroupItem value="SMS_ONLY" id="sms" data-testid="radio-contractor-notif-sms" />
                      <Label htmlFor="sms" className="cursor-pointer flex-1">
                        <div className="font-medium">SMS Only</div>
                        <div className="text-xs text-muted-foreground">Receive updates via text message</div>
                      </Label>
                    </div>
                    </RadioGroup>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          <div className="flex gap-3 px-6 py-4 border-t flex-shrink-0 bg-background">
            {step > 1 && (
              <Button
                type="button"
                variant="outline"
                onClick={() => setStep(step - 1)}
                className="flex-1"
                data-testid="button-contractor-back"
              >
                Back
              </Button>
            )}
            {step < 3 ? (
              <Button
                type="button"
                onClick={nextStep}
                className="flex-1 bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600"
                data-testid="button-contractor-next"
              >
                Continue
              </Button>
            ) : (
              <Button
                type="submit"
                disabled={isSubmitting}
                className="flex-1 bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600"
                data-testid="button-contractor-complete"
              >
                {isSubmitting ? "Setting up your account..." : "Complete Sign-Up"}
              </Button>
            )}
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
