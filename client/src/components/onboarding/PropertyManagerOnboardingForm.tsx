import { useState, useRef, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Building2, Phone, Mail, Users, Plus, Trash2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

const propertyAddressSchema = z.object({
  street: z.string().min(1, "Street address is required"),
  city: z.string().min(1, "City is required"),
  state: z.string().min(2, "State is required"),
  postalCode: z.string().min(5, "Postal code is required"),
});

const workerSchema = z.object({
  name: z.string().min(2, "Worker name is required"),
  role: z.enum(["MAINTENANCE", "CLEANER", "LANDSCAPER", "SECURITY", "OTHER"]),
  phone: z.string().min(10, "Phone number is required"),
  email: z.string().email("Valid email is required").optional(),
});

const onboardingSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  email: z.string().email("Please enter a valid email address"),
  companyName: z.string().min(2, "Company name is required"),
  phone: z.string().min(10, "Please enter a valid phone number"),
  propertyCount: z.number().min(1, "Must manage at least 1 property"),
  propertiesSeed: z.array(propertyAddressSchema).max(5, "Maximum 5 properties in onboarding").optional().default([]),
  workersSeed: z.array(workerSchema).max(3, "Maximum 3 workers in onboarding").optional().default([]),
  notificationPreference: z.enum(["EMAIL_ONLY", "SMS_ONLY", "EMAIL_AND_SMS", "NONE"]),
});

type OnboardingData = z.infer<typeof onboardingSchema>;

interface PropertyManagerOnboardingFormProps {
  open: boolean;
  onClose: () => void;
  onComplete: (data: OnboardingData) => Promise<void>;
  userName?: string;
  userEmail?: string;
  initialPropertyCount?: number;
  selectedAddOns?: string[];
}

const WORKER_ROLES = [
  { value: "MAINTENANCE", label: "Maintenance Tech", icon: "🔧" },
  { value: "CLEANER", label: "Cleaning Staff", icon: "🧹" },
  { value: "LANDSCAPER", label: "Landscaper", icon: "🌿" },
  { value: "SECURITY", label: "Security", icon: "🛡️" },
  { value: "OTHER", label: "Other", icon: "👷" },
];

export function PropertyManagerOnboardingForm({
  open,
  onClose,
  onComplete,
  userName,
  userEmail,
  initialPropertyCount = 10,
  selectedAddOns = [],
}: PropertyManagerOnboardingFormProps) {
  const [step, setStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [skipProperties, setSkipProperties] = useState(false);
  const [skipWorkers, setSkipWorkers] = useState(false);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  const form = useForm<OnboardingData>({
    resolver: zodResolver(onboardingSchema),
    defaultValues: {
      name: userName || "",
      email: userEmail || "",
      companyName: "",
      phone: "",
      propertyCount: initialPropertyCount,
      propertiesSeed: [],
      workersSeed: [],
      notificationPreference: "EMAIL_AND_SMS",
    },
  });

  useEffect(() => {
    scrollContainerRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
  }, [step]);

  // Sync form with latest calculator values when modal opens or values change
  useEffect(() => {
    if (open) {
      form.setValue('propertyCount', initialPropertyCount);
    }
  }, [open, initialPropertyCount, form]);

  const addProperty = () => {
    const current = form.watch("propertiesSeed") || [];
    if (current.length < 5) {
      form.setValue("propertiesSeed", [...current, { street: "", city: "", state: "", postalCode: "" }]);
    }
  };

  const removeProperty = (index: number) => {
    const current = form.watch("propertiesSeed") || [];
    form.setValue("propertiesSeed", current.filter((_, i) => i !== index));
  };

  const addWorker = () => {
    const current = form.watch("workersSeed") || [];
    if (current.length < 3) {
      form.setValue("workersSeed", [...current, { name: "", role: "MAINTENANCE", phone: "", email: "" }]);
    }
  };

  const removeWorker = (index: number) => {
    const current = form.watch("workersSeed") || [];
    form.setValue("workersSeed", current.filter((_, i) => i !== index));
  };

  const onSubmit = async (data: OnboardingData) => {
    setIsSubmitting(true);
    try {
      const payload = {
        name: data.name,
        email: data.email,
        companyName: data.companyName,
        phone: data.phone,
        propertyCount: data.propertyCount,
        notificationPreference: data.notificationPreference,
        planMetadata: {
          propertyCount: data.propertyCount,
          propertiesSeed: skipProperties ? [] : data.propertiesSeed,
          workersSeed: skipWorkers ? [] : data.workersSeed,
          selectedAddOns: selectedAddOns,
        },
      };
      await onComplete(payload as any);
    } catch (error) {
      setIsSubmitting(false);
    }
  };

  const nextStep = async () => {
    const fields = step === 1 
      ? ["name", "email", "companyName", "phone"] 
      : step === 2 
      ? ["propertyCount"]
      : ["notificationPreference"];
    
    const isValid = await form.trigger(fields as any);
    if (isValid) setStep(step + 1);
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent 
        className="sm:max-w-[700px] p-0 gap-0 max-h-screen md:max-h-[90vh] flex flex-col" 
        onInteractOutside={(e) => e.preventDefault()}
      >
        <DialogHeader className="px-6 pt-6 pb-4 bg-gradient-to-r from-cyan-500 to-yellow-500 flex-shrink-0">
          <DialogTitle className="text-2xl text-white flex items-center gap-2">
            <Building2 className="h-6 w-6" />
            Welcome to ServiceVault
          </DialogTitle>
          <div className="mt-3 flex gap-2">
            {[1, 2, 3].map((s) => (
              <div
                key={s}
                className={`h-2 rounded-full flex-1 transition-all ${
                  s <= step ? 'bg-white' : 'bg-white/30'
                }`}
              />
            ))}
          </div>
        </DialogHeader>

        <div 
          ref={scrollContainerRef}
          className="flex-1 overflow-y-auto px-6 py-6"
        >
          <AnimatePresence mode="wait">
            <motion.div
              key={step}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.2 }}
            >
              {step === 1 && (
                <div className="space-y-6">
                  <div>
                    <h3 className="text-lg font-semibold mb-2">Company Information</h3>
                    <p className="text-sm text-muted-foreground mb-4">
                      Tell us about your property management business
                    </p>
                  </div>

                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="name">Your Name *</Label>
                      <Input
                        id="name"
                        placeholder="John Smith"
                        {...form.register("name")}
                        data-testid="input-pm-name"
                      />
                      {form.formState.errors.name && (
                        <p className="text-sm text-destructive mt-1">{form.formState.errors.name.message}</p>
                      )}
                    </div>

                    <div>
                      <Label htmlFor="email">Email Address *</Label>
                      <div className="relative">
                        <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                        <Input
                          id="email"
                          type="email"
                          placeholder="john@propertymanagement.com"
                          className="pl-10"
                          {...form.register("email")}
                          data-testid="input-pm-email"
                        />
                      </div>
                      {form.formState.errors.email && (
                        <p className="text-sm text-destructive mt-1">{form.formState.errors.email.message}</p>
                      )}
                    </div>

                    <div>
                      <Label htmlFor="companyName">Company Name *</Label>
                      <Input
                        id="companyName"
                        placeholder="ABC Property Management LLC"
                        {...form.register("companyName")}
                        data-testid="input-pm-company"
                      />
                      {form.formState.errors.companyName && (
                        <p className="text-sm text-destructive mt-1">{form.formState.errors.companyName.message}</p>
                      )}
                    </div>

                    <div>
                      <Label htmlFor="phone">Phone Number *</Label>
                      <div className="relative">
                        <Phone className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                        <Input
                          id="phone"
                          type="tel"
                          placeholder="(555) 123-4567"
                          className="pl-10"
                          {...form.register("phone")}
                          data-testid="input-pm-phone"
                        />
                      </div>
                      {form.formState.errors.phone && (
                        <p className="text-sm text-destructive mt-1">{form.formState.errors.phone.message}</p>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {step === 2 && (
                <div className="space-y-6">
                  <div>
                    <h3 className="text-lg font-semibold mb-2">Property Portfolio</h3>
                    <p className="text-sm text-muted-foreground mb-4">
                      How many properties do you manage? You can add addresses now or later.
                    </p>
                  </div>

                  <div>
                    <Label htmlFor="propertyCount">Total Number of Properties *</Label>
                    <Input
                      id="propertyCount"
                      type="number"
                      min="1"
                      {...form.register("propertyCount", { valueAsNumber: true })}
                      data-testid="input-pm-property-count"
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      Enter the total number of properties you manage
                    </p>
                    {form.formState.errors.propertyCount && (
                      <p className="text-sm text-destructive mt-1">{form.formState.errors.propertyCount.message}</p>
                    )}
                  </div>

                  {!skipProperties && (
                    <div className="space-y-4 pt-4 border-t">
                      <div className="flex items-center justify-between">
                        <Label>Add Initial Properties (Optional, max 5)</Label>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={addProperty}
                          disabled={(form.watch("propertiesSeed") || []).length >= 5}
                          data-testid="button-add-property"
                        >
                          <Plus className="h-4 w-4 mr-1" />
                          Add Property
                        </Button>
                      </div>

                      {(form.watch("propertiesSeed") || []).map((_, index) => (
                        <div key={index} className="space-y-2 p-4 border rounded-lg bg-muted/30">
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-sm font-medium">Property {index + 1}</span>
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => removeProperty(index)}
                              data-testid={`button-remove-property-${index}`}
                            >
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          </div>
                          <Input
                            placeholder="Street Address"
                            {...form.register(`propertiesSeed.${index}.street`)}
                            data-testid={`input-property-street-${index}`}
                          />
                          <div className="grid grid-cols-2 gap-2">
                            <Input
                              placeholder="City"
                              {...form.register(`propertiesSeed.${index}.city`)}
                              data-testid={`input-property-city-${index}`}
                            />
                            <Input
                              placeholder="State"
                              {...form.register(`propertiesSeed.${index}.state`)}
                              data-testid={`input-property-state-${index}`}
                            />
                          </div>
                          <Input
                            placeholder="Postal Code"
                            {...form.register(`propertiesSeed.${index}.postalCode`)}
                            data-testid={`input-property-postal-${index}`}
                          />
                        </div>
                      ))}

                      {(form.watch("propertiesSeed") || []).length === 0 && (
                        <Button
                          type="button"
                          variant="link"
                          onClick={() => setSkipProperties(true)}
                          data-testid="button-skip-properties"
                        >
                          Skip - I'll add properties later
                        </Button>
                      )}
                    </div>
                  )}

                  {skipProperties && (
                    <div className="p-4 bg-muted rounded-lg">
                      <p className="text-sm text-muted-foreground">
                        You can add property addresses from your dashboard after onboarding.
                      </p>
                    </div>
                  )}
                </div>
              )}

              {step === 3 && (
                <div className="space-y-6">
                  <div>
                    <h3 className="text-lg font-semibold mb-2">Worker Roster & Notifications</h3>
                    <p className="text-sm text-muted-foreground mb-4">
                      Add your initial workers and set notification preferences
                    </p>
                  </div>

                  {!skipWorkers && (
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <Label>Add Initial Workers (Optional, max 3)</Label>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={addWorker}
                          disabled={(form.watch("workersSeed") || []).length >= 3}
                          data-testid="button-add-worker"
                        >
                          <Plus className="h-4 w-4 mr-1" />
                          Add Worker
                        </Button>
                      </div>

                      {(form.watch("workersSeed") || []).map((_, index) => (
                        <div key={index} className="space-y-2 p-4 border rounded-lg bg-muted/30">
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-sm font-medium flex items-center gap-2">
                              <Users className="h-4 w-4" />
                              Worker {index + 1}
                            </span>
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => removeWorker(index)}
                              data-testid={`button-remove-worker-${index}`}
                            >
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          </div>
                          <Input
                            placeholder="Worker Name"
                            {...form.register(`workersSeed.${index}.name`)}
                            data-testid={`input-worker-name-${index}`}
                          />
                          <select
                            className="w-full px-3 py-2 border rounded-md"
                            {...form.register(`workersSeed.${index}.role`)}
                            data-testid={`select-worker-role-${index}`}
                          >
                            {WORKER_ROLES.map((role) => (
                              <option key={role.value} value={role.value}>
                                {role.icon} {role.label}
                              </option>
                            ))}
                          </select>
                          <Input
                            placeholder="Phone Number"
                            {...form.register(`workersSeed.${index}.phone`)}
                            data-testid={`input-worker-phone-${index}`}
                          />
                          <Input
                            type="email"
                            placeholder="Email (optional)"
                            {...form.register(`workersSeed.${index}.email`)}
                            data-testid={`input-worker-email-${index}`}
                          />
                        </div>
                      ))}

                      {(form.watch("workersSeed") || []).length === 0 && (
                        <Button
                          type="button"
                          variant="link"
                          onClick={() => setSkipWorkers(true)}
                          data-testid="button-skip-workers"
                        >
                          Skip - I'll add workers later
                        </Button>
                      )}
                    </div>
                  )}

                  {skipWorkers && (
                    <div className="p-4 bg-muted rounded-lg mb-4">
                      <p className="text-sm text-muted-foreground">
                        You can add workers from your dashboard after onboarding.
                      </p>
                    </div>
                  )}

                  <div className="pt-4 border-t">
                    <Label className="mb-3 block">Notification Preferences</Label>
                    <RadioGroup
                      value={form.watch("notificationPreference")}
                      onValueChange={(value) => form.setValue("notificationPreference", value as any)}
                    >
                      <div className="space-y-2">
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="EMAIL_AND_SMS" id="both" data-testid="radio-notify-both" />
                          <Label htmlFor="both" className="cursor-pointer">Email & SMS (Recommended)</Label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="EMAIL_ONLY" id="email" data-testid="radio-notify-email" />
                          <Label htmlFor="email" className="cursor-pointer">Email Only</Label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="SMS_ONLY" id="sms" data-testid="radio-notify-sms" />
                          <Label htmlFor="sms" className="cursor-pointer">SMS Only</Label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="NONE" id="none" data-testid="radio-notify-none" />
                          <Label htmlFor="none" className="cursor-pointer">None</Label>
                        </div>
                      </div>
                    </RadioGroup>
                  </div>
                </div>
              )}
            </motion.div>
          </AnimatePresence>
        </div>

        <div className="px-6 py-4 bg-muted/30 flex justify-between gap-4 flex-shrink-0">
          <Button
            type="button"
            variant="outline"
            onClick={() => step > 1 ? setStep(step - 1) : onClose()}
            disabled={isSubmitting}
            data-testid="button-pm-back"
          >
            {step === 1 ? "Cancel" : "Back"}
          </Button>
          
          {step < 3 ? (
            <Button
              type="button"
              onClick={nextStep}
              className="bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600"
              data-testid="button-pm-next"
            >
              Next Step
            </Button>
          ) : (
            <Button
              type="button"
              onClick={form.handleSubmit(onSubmit)}
              disabled={isSubmitting}
              className="bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600"
              data-testid="button-pm-complete"
            >
              {isSubmitting ? "Setting up..." : "Complete Setup"}
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
