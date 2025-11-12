import { useState, useRef, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Home, Phone, Mail, MapPin } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

const onboardingSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  email: z.string().email("Please enter a valid email address"),
  phone: z.string().min(10, "Please enter a valid phone number"),
  propertyAddress: z.string().min(5, "Please enter your property address"),
  propertyType: z.enum(["SINGLE_FAMILY", "CONDO", "MULTI_FAMILY", "COMMERCIAL"]),
  numberOfProperties: z.number().min(1).max(100),
  notificationPreference: z.enum(["EMAIL_ONLY", "SMS_ONLY", "EMAIL_AND_SMS", "NONE"]),
});

type OnboardingData = z.infer<typeof onboardingSchema>;

interface HomeownerOnboardingFormProps {
  open: boolean;
  onClose: () => void;
  onComplete: (data: OnboardingData) => Promise<void>;
  userName?: string;
  userEmail?: string;
}

export function HomeownerOnboardingForm({
  open,
  onClose,
  onComplete,
  userName,
  userEmail,
}: HomeownerOnboardingFormProps) {
  const [step, setStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  const form = useForm<OnboardingData>({
    resolver: zodResolver(onboardingSchema),
    defaultValues: {
      name: userName || "",
      email: userEmail || "",
      phone: "",
      propertyAddress: "",
      propertyType: "SINGLE_FAMILY",
      numberOfProperties: 1,
      notificationPreference: "EMAIL_AND_SMS",
    },
  });

  useEffect(() => {
    scrollContainerRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
  }, [step]);

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
      ? ["name", "email", "phone"] 
      : step === 2 
      ? ["propertyAddress", "propertyType", "numberOfProperties"]
      : ["notificationPreference"];
    
    const isValid = await form.trigger(fields as any);
    if (isValid) setStep(step + 1);
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[600px] p-0 gap-0 max-h-screen md:max-h-[90vh] flex flex-col" onInteractOutside={(e) => e.preventDefault()}>
        <DialogHeader className="px-6 pt-6 pb-4 bg-gradient-to-r from-blue-500 to-cyan-500 flex-shrink-0">
          <DialogTitle className="text-2xl text-white flex items-center gap-2">
            <Home className="h-6 w-6" />
            Welcome to FixTrack Pro
          </DialogTitle>
          <p className="text-white/90 text-sm mt-1">Let's set up your homeowner account</p>
        </DialogHeader>

        {/* Progress Indicator */}
        <div className="px-6 py-4 bg-muted/30 flex-shrink-0">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium">Step {step} of 3</span>
            <span className="text-sm text-muted-foreground">
              {step === 1 ? "Personal Info" : step === 2 ? "Property Details" : "Preferences"}
            </span>
          </div>
          <div className="h-2 bg-muted rounded-full overflow-hidden">
            <motion.div
              className="h-full bg-gradient-to-r from-blue-500 to-cyan-500"
              initial={{ width: "0%" }}
              animate={{ width: `${(step / 3) * 100}%` }}
              transition={{ duration: 0.3, ease: "easeOut" }}
            />
          </div>
        </div>

        <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col flex-1 min-h-0">
          <div ref={scrollContainerRef} className="px-6 py-6 overflow-y-auto flex-1">
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
                      data-testid="input-onboarding-name"
                    />
                    {form.formState.errors.name && (
                      <p className="text-sm text-destructive">{form.formState.errors.name.message}</p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="email" className="flex items-center gap-2">
                      <Mail className="h-4 w-4 text-muted-foreground" />
                      Email Address
                    </Label>
                    <Input
                      id="email"
                      {...form.register("email")}
                      type="email"
                      placeholder="john@example.com"
                      className="h-11"
                      data-testid="input-homeowner-email"
                    />
                    {form.formState.errors.email && (
                      <p className="text-sm text-destructive">{form.formState.errors.email.message}</p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="phone" className="flex items-center gap-2">
                      <Phone className="h-4 w-4 text-muted-foreground" />
                      Phone Number
                    </Label>
                    <Input
                      id="phone"
                      {...form.register("phone")}
                      placeholder="(555) 123-4567"
                      type="tel"
                      className="h-11"
                      data-testid="input-onboarding-phone"
                    />
                    {form.formState.errors.phone && (
                      <p className="text-sm text-destructive">{form.formState.errors.phone.message}</p>
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
                  <Label htmlFor="propertyAddress" className="flex items-center gap-2">
                    <MapPin className="h-4 w-4 text-muted-foreground" />
                    Primary Property Address
                  </Label>
                  <Input
                    id="propertyAddress"
                    {...form.register("propertyAddress")}
                    placeholder="123 Main St, City, State 12345"
                    className="h-11"
                    data-testid="input-onboarding-address"
                  />
                  {form.formState.errors.propertyAddress && (
                    <p className="text-sm text-destructive">{form.formState.errors.propertyAddress.message}</p>
                  )}
                </div>

                <div className="space-y-3">
                  <Label>Property Type</Label>
                  <RadioGroup
                    value={form.watch("propertyType")}
                    onValueChange={(value: any) => form.setValue("propertyType", value, { shouldValidate: true })}
                    className="space-y-2"
                  >
                    <div
                      className={`flex items-center space-x-3 rounded-lg border-2 p-3 cursor-pointer transition-all ${
                        form.watch("propertyType") === "SINGLE_FAMILY"
                          ? "border-primary bg-primary/5"
                          : "border-border hover:border-primary/50 hover:bg-muted/50"
                      }`}
                      onClick={() => form.setValue("propertyType", "SINGLE_FAMILY", { shouldValidate: true })}
                      data-testid="radio-property-single-family"
                    >
                      <RadioGroupItem value="SINGLE_FAMILY" id="property-single-family" />
                      <Label className="flex-1 cursor-pointer font-normal pointer-events-none">
                        🏠 Single Family Home
                      </Label>
                    </div>
                    <div
                      className={`flex items-center space-x-3 rounded-lg border-2 p-3 cursor-pointer transition-all ${
                        form.watch("propertyType") === "CONDO"
                          ? "border-primary bg-primary/5"
                          : "border-border hover:border-primary/50 hover:bg-muted/50"
                      }`}
                      onClick={() => form.setValue("propertyType", "CONDO", { shouldValidate: true })}
                      data-testid="radio-property-condo"
                    >
                      <RadioGroupItem value="CONDO" id="property-condo" />
                      <Label className="flex-1 cursor-pointer font-normal pointer-events-none">
                        🏢 Condo/Townhouse
                      </Label>
                    </div>
                    <div
                      className={`flex items-center space-x-3 rounded-lg border-2 p-3 cursor-pointer transition-all ${
                        form.watch("propertyType") === "MULTI_FAMILY"
                          ? "border-primary bg-primary/5"
                          : "border-border hover:border-primary/50 hover:bg-muted/50"
                      }`}
                      onClick={() => form.setValue("propertyType", "MULTI_FAMILY", { shouldValidate: true })}
                      data-testid="radio-property-multi-family"
                    >
                      <RadioGroupItem value="MULTI_FAMILY" id="property-multi-family" />
                      <Label className="flex-1 cursor-pointer font-normal pointer-events-none">
                        🏘️ Multi-Family
                      </Label>
                    </div>
                    <div
                      className={`flex items-center space-x-3 rounded-lg border-2 p-3 cursor-pointer transition-all ${
                        form.watch("propertyType") === "COMMERCIAL"
                          ? "border-primary bg-primary/5"
                          : "border-border hover:border-primary/50 hover:bg-muted/50"
                      }`}
                      onClick={() => form.setValue("propertyType", "COMMERCIAL", { shouldValidate: true })}
                      data-testid="radio-property-commercial"
                    >
                      <RadioGroupItem value="COMMERCIAL" id="property-commercial" />
                      <Label className="flex-1 cursor-pointer font-normal pointer-events-none">
                        🏭 Commercial Property
                      </Label>
                    </div>
                  </RadioGroup>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="numberOfProperties">How many properties do you want to track?</Label>
                  <Input
                    id="numberOfProperties"
                    type="number"
                    min="1"
                    max="100"
                    {...form.register("numberOfProperties", { valueAsNumber: true })}
                    className="h-11"
                    data-testid="input-number-properties"
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
                  <Label>How would you like to receive maintenance reminders?</Label>
                  <RadioGroup
                    value={form.watch("notificationPreference")}
                    onValueChange={(value: any) => form.setValue("notificationPreference", value)}
                    className="space-y-2"
                  >
                    <div className="flex items-center space-x-2 p-3 rounded-lg border hover:bg-muted/50 cursor-pointer">
                      <RadioGroupItem value="EMAIL_AND_SMS" id="both" data-testid="radio-notif-both" />
                      <Label htmlFor="both" className="cursor-pointer flex-1">
                        <div className="font-medium">Email & SMS</div>
                        <div className="text-xs text-muted-foreground">Get reminders via both channels (recommended)</div>
                      </Label>
                    </div>
                    <div className="flex items-center space-x-2 p-3 rounded-lg border hover:bg-muted/50 cursor-pointer">
                      <RadioGroupItem value="EMAIL_ONLY" id="email" data-testid="radio-notif-email" />
                      <Label htmlFor="email" className="cursor-pointer flex-1">
                        <div className="font-medium">Email Only</div>
                        <div className="text-xs text-muted-foreground">Receive reminders via email</div>
                      </Label>
                    </div>
                    <div className="flex items-center space-x-2 p-3 rounded-lg border hover:bg-muted/50 cursor-pointer">
                      <RadioGroupItem value="SMS_ONLY" id="sms" data-testid="radio-notif-sms" />
                      <Label htmlFor="sms" className="cursor-pointer flex-1">
                        <div className="font-medium">SMS Only</div>
                        <div className="text-xs text-muted-foreground">Receive reminders via text message</div>
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
                data-testid="button-onboarding-back"
              >
                Back
              </Button>
            )}
            {step < 3 ? (
              <Button
                type="button"
                onClick={nextStep}
                className="flex-1 bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600"
                data-testid="button-onboarding-next"
              >
                Continue
              </Button>
            ) : (
              <Button
                type="submit"
                disabled={isSubmitting}
                className="flex-1 bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600"
                data-testid="button-onboarding-complete"
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
