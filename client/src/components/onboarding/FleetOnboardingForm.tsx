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
import { Truck, Phone, Mail, Briefcase, Building2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

const onboardingSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  email: z.string().email("Please enter a valid email address"),
  companyName: z.string().min(2, "Company name is required"),
  industry: z.string().min(1, "Please select an industry"),
  phone: z.string().min(10, "Please enter a valid phone number"),
  fleetSize: z.number().min(1).max(10000),
  assetCategories: z.array(z.string()).min(1, "Please select at least one asset category"),
  numberOfOperators: z.number().min(1).max(5000),
  notificationPreference: z.enum(["EMAIL_ONLY", "SMS_ONLY", "EMAIL_AND_SMS", "NONE"]),
});

type OnboardingData = z.infer<typeof onboardingSchema>;

interface FleetOnboardingFormProps {
  open: boolean;
  onClose: () => void;
  onComplete: (data: OnboardingData) => Promise<void>;
  userName?: string;
  userEmail?: string;
}

const INDUSTRIES = [
  { value: "Healthcare & Hospitals", label: "Healthcare & Hospitals", icon: "🏥" },
  { value: "Construction & Heavy Equipment", label: "Construction & Heavy Equipment", icon: "🏗️" },
  { value: "Equipment Rental & Leasing", label: "Equipment Rental & Leasing", icon: "📦" },
  { value: "Agriculture & Farm Equipment", label: "Agriculture & Farm Equipment", icon: "🚜" },
  { value: "Transportation & Logistics", label: "Transportation & Logistics", icon: "🚚" },
];

const ASSET_CATEGORIES = [
  { id: "trucks", label: "Trucks & Vans", icon: "🚚" },
  { id: "heavy", label: "Heavy Equipment", icon: "🏗️" },
  { id: "medical", label: "Medical Devices", icon: "🏥" },
  { id: "farm", label: "Farm Equipment", icon: "🚜" },
  { id: "trailers", label: "Trailers", icon: "📦" },
  { id: "tools", label: "Power Tools", icon: "🔧" },
];

export function FleetOnboardingForm({
  open,
  onClose,
  onComplete,
  userName,
  userEmail,
}: FleetOnboardingFormProps) {
  const [step, setStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);

  const form = useForm<OnboardingData>({
    resolver: zodResolver(onboardingSchema),
    defaultValues: {
      name: userName || "",
      email: userEmail || "",
      companyName: "",
      industry: "",
      phone: "",
      fleetSize: 10,
      assetCategories: [],
      numberOfOperators: 5,
      notificationPreference: "EMAIL_AND_SMS",
    },
  });

  const toggleCategory = (categoryId: string) => {
    const updated = selectedCategories.includes(categoryId)
      ? selectedCategories.filter(c => c !== categoryId)
      : [...selectedCategories, categoryId];
    setSelectedCategories(updated);
    form.setValue("assetCategories", updated);
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
      ? ["name", "email", "companyName", "industry"] 
      : step === 2 
      ? ["phone", "fleetSize", "assetCategories", "numberOfOperators"]
      : ["notificationPreference"];
    
    const isValid = await form.trigger(fields as any);
    if (isValid) setStep(step + 1);
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[600px] p-0 gap-0 max-h-screen md:max-h-[90vh] flex flex-col" onInteractOutside={(e) => e.preventDefault()}>
        <DialogHeader className="px-6 pt-6 pb-4 bg-gradient-to-r from-purple-500 to-pink-500 flex-shrink-0">
          <DialogTitle className="text-2xl text-white flex items-center gap-2">
            <Truck className="h-6 w-6" />
            Welcome to FixTrack Pro
          </DialogTitle>
          <p className="text-white/90 text-sm mt-1">Let's set up your fleet management account</p>
        </DialogHeader>

        {/* Progress Indicator */}
        <div className="px-6 py-4 bg-muted/30 flex-shrink-0">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium">Step {step} of 3</span>
            <span className="text-sm text-muted-foreground">
              {step === 1 ? "Company Info" : step === 2 ? "Fleet Details" : "Preferences"}
            </span>
          </div>
          <div className="h-2 bg-muted rounded-full overflow-hidden">
            <motion.div
              className="h-full bg-gradient-to-r from-purple-500 to-pink-500"
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
                    data-testid="input-fleet-name"
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
                      data-testid="input-fleet-email"
                    />
                    {form.formState.errors.email && (
                      <p className="text-sm text-destructive">{form.formState.errors.email.message}</p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="companyName" className="flex items-center gap-2">
                      <Building2 className="h-4 w-4 text-muted-foreground" />
                      Company Name
                    </Label>
                  <Input
                    id="companyName"
                    {...form.register("companyName")}
                    placeholder="ABC Fleet Services"
                    className="h-11"
                    data-testid="input-fleet-company-name"
                  />
                  {form.formState.errors.companyName && (
                    <p className="text-sm text-destructive">{form.formState.errors.companyName.message}</p>
                  )}
                </div>

                <div className="space-y-3">
                  <Label className="flex items-center gap-2">
                    <Briefcase className="h-4 w-4 text-muted-foreground" />
                    Industry
                  </Label>
                  <RadioGroup
                    value={form.watch("industry")}
                    onValueChange={(value) => form.setValue("industry", value, { shouldValidate: true })}
                    className="space-y-2"
                  >
                    {INDUSTRIES.map((industry) => {
                      const id = `industry-${industry.value.toLowerCase().replace(/\s+|&/g, '-').replace(/--+/g, '-')}`;
                      return (
                        <div
                          key={industry.value}
                          className={`flex items-center space-x-3 rounded-lg border-2 p-3 cursor-pointer transition-all ${
                            form.watch("industry") === industry.value
                              ? "border-primary bg-primary/5"
                              : "border-border hover:border-primary/50 hover:bg-muted/50"
                          }`}
                          onClick={() => form.setValue("industry", industry.value, { shouldValidate: true })}
                          data-testid={`radio-${id}`}
                        >
                          <RadioGroupItem value={industry.value} id={id} />
                          <Label
                            htmlFor={id}
                            className="flex items-center gap-2 flex-1 cursor-pointer font-normal"
                          >
                            <span className="text-xl">{industry.icon}</span>
                            <span>{industry.label}</span>
                          </Label>
                        </div>
                      );
                    })}
                  </RadioGroup>
                  {form.formState.errors.industry && (
                    <p className="text-sm text-destructive">{form.formState.errors.industry.message}</p>
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
                    data-testid="input-fleet-phone"
                  />
                  {form.formState.errors.phone && (
                    <p className="text-sm text-destructive">{form.formState.errors.phone.message}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="fleetSize">Fleet Size (number of assets)</Label>
                  <Input
                    id="fleetSize"
                    type="number"
                    min="1"
                    max="10000"
                    {...form.register("fleetSize", { valueAsNumber: true })}
                    className="h-11"
                    data-testid="input-fleet-size"
                  />
                  <p className="text-xs text-muted-foreground">Total number of vehicles/equipment you want to track</p>
                </div>

                <div className="space-y-3">
                  <Label>Asset Categories (select all that apply)</Label>
                  <div className="grid grid-cols-2 gap-2">
                    {ASSET_CATEGORIES.map((category) => (
                      <div
                        key={category.id}
                        className={`flex items-center space-x-2 p-3 rounded-lg border transition-colors ${
                          selectedCategories.includes(category.id)
                            ? "border-primary bg-primary/5"
                            : "hover:bg-muted/50"
                        }`}
                      >
                        <Checkbox
                          checked={selectedCategories.includes(category.id)}
                          onCheckedChange={() => toggleCategory(category.id)}
                          data-testid={`checkbox-asset-${category.id}`}
                        />
                        <Label className="cursor-pointer flex-1 flex items-center gap-2" onClick={() => toggleCategory(category.id)}>
                          <span>{category.icon}</span>
                          <span className="text-sm">{category.label}</span>
                        </Label>
                      </div>
                    ))}
                  </div>
                  {form.formState.errors.assetCategories && (
                    <p className="text-sm text-destructive">{form.formState.errors.assetCategories.message}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="numberOfOperators">Number of Operators/Drivers</Label>
                  <Input
                    id="numberOfOperators"
                    type="number"
                    min="1"
                    max="5000"
                    {...form.register("numberOfOperators", { valueAsNumber: true })}
                    className="h-11"
                    data-testid="input-operators"
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
                    <Label>How would you like to receive maintenance alerts?</Label>
                    <RadioGroup
                    value={form.watch("notificationPreference")}
                    onValueChange={(value: any) => form.setValue("notificationPreference", value)}
                    className="space-y-2"
                  >
                    <div className="flex items-center space-x-2 p-3 rounded-lg border hover:bg-muted/50 cursor-pointer">
                      <RadioGroupItem value="EMAIL_AND_SMS" id="both" data-testid="radio-fleet-notif-both" />
                      <Label htmlFor="both" className="cursor-pointer flex-1">
                        <div className="font-medium">Email & SMS</div>
                        <div className="text-xs text-muted-foreground">Stay updated via both channels (recommended)</div>
                      </Label>
                    </div>
                    <div className="flex items-center space-x-2 p-3 rounded-lg border hover:bg-muted/50 cursor-pointer">
                      <RadioGroupItem value="EMAIL_ONLY" id="email" data-testid="radio-fleet-notif-email" />
                      <Label htmlFor="email" className="cursor-pointer flex-1">
                        <div className="font-medium">Email Only</div>
                        <div className="text-xs text-muted-foreground">Receive alerts via email</div>
                      </Label>
                    </div>
                    <div className="flex items-center space-x-2 p-3 rounded-lg border hover:bg-muted/50 cursor-pointer">
                      <RadioGroupItem value="SMS_ONLY" id="sms" data-testid="radio-fleet-notif-sms" />
                      <Label htmlFor="sms" className="cursor-pointer flex-1">
                        <div className="font-medium">SMS Only</div>
                        <div className="text-xs text-muted-foreground">Receive alerts via text message</div>
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
                data-testid="button-fleet-back"
              >
                Back
              </Button>
            )}
            {step < 3 ? (
              <Button
                type="button"
                onClick={nextStep}
                className="flex-1 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600"
                data-testid="button-fleet-next"
              >
                Continue
              </Button>
            ) : (
              <Button
                type="submit"
                disabled={isSubmitting}
                className="flex-1 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600"
                data-testid="button-fleet-complete"
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
