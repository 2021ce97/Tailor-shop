"use client";

import { useState } from "react";
import { Modal } from "@/components/ui/modal";
import { Field } from "@/components/shared/field";
import { Button } from "@/components/ui/button";

interface InlineCustomerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (customer: { id: number; name: string; phone: string }) => void;
}

export function InlineCustomerModal({ isOpen, onClose, onSave }: InlineCustomerModalProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);
    setFieldErrors({});

    const formData = new FormData(e.currentTarget);
    const data = {
      name: formData.get("name") as string,
      phone: formData.get("phone") as string,
      address: formData.get("address") as string,
    };

    // Validation
    const errors: Record<string, string> = {};
    if (!data.name || data.name.trim() === "") {
      errors.name = "Customer name is required";
    }
    if (!data.phone || data.phone.trim() === "") {
      errors.phone = "Phone number is required";
    }
    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      setIsSubmitting(false);
      return;
    }

    try {
      const response = await fetch("/api/customers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to create customer");
      }

      const customer = await response.json();
      onSave(customer);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Add New Customer">
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="rounded-md bg-red-50 border border-red-200 px-4 py-2.5 text-sm text-red-800">
            {error}
          </div>
        )}

        <Field
          label="Customer Name"
          name="name"
          required
          error={fieldErrors.name ? [fieldErrors.name] : undefined}
          autoFocus
        />

        <Field
          label="Phone Number"
          name="phone"
          type="tel"
          required
          error={fieldErrors.phone ? [fieldErrors.phone] : undefined}
        />

        <label className="flex flex-col gap-1">
          <span className="text-xs font-medium text-slate-600">Address</span>
          <textarea
            name="address"
            rows={3}
            className="rounded-md border border-slate-300 bg-white px-3 py-1.5 text-sm outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-400"
          />
        </label>

        <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
          <Button type="button" variant="outline" onClick={onClose} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? "Saving..." : "Save Customer"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
