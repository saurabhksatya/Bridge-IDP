"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { type z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { toast } from "sonner";
import { useState } from "react";
import { addBridgeSchema } from "@/app/schema/add-bridge";
import { api } from "@/trpc/react";

type AddBridgeFormValues = z.infer<typeof addBridgeSchema>;

export function AddBridgeForm() {
  const [error, setError] = useState(false);
  // const utils = api.useUtils();
  const addBridgeMutation = api.bridge.addBridge.useMutation({
    onSuccess() {
      toast.success("Bridge added successfully!");
      form.reset();
      // void utils.user.ownedDevices.invalidate();
    },
    onError() {
      toast.error("Failed to add bridge. Please try again.");
      setError(true);
    },
  });

  const form = useForm<AddBridgeFormValues>({
    resolver: zodResolver(addBridgeSchema),
    defaultValues: {
      bridgeName: "",
      bridgeId: "",
      bridgeSecret: "",
    },
  });

  async function onSubmit(data: AddBridgeFormValues) {
    setError(false);
    await addBridgeMutation.mutateAsync(data);
  }

  return (
    <Card className="m-10 w-2/3 border-0">
      <CardHeader className="text-center">
        <div className="mx-auto mb-4 flex size-12 items-center justify-center rounded-lg bg-gradient-to-tr from-indigo-500 to-blue-500 shadow-lg">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="text-primary-foreground"
          >
            <path d="M12 2v20" />
            <path d="M2 12h20" />
          </svg>
        </div>
        <CardTitle className="text-xl font-semibold tracking-tight">
          Add New Bridge
        </CardTitle>
        <CardDescription className="text-muted-foreground">
          Enter your Bridge credentials to add it to your account
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(onSubmit)}
            className="flex flex-col gap-5"
          >
            <FormField
              control={form.control}
              name="bridgeName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Bridge Name</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="Enter bridge name"
                      className="h-10"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="bridgeId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Bridge ID</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="Enter bridge ID"
                      className="h-10"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="bridgeSecret"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Bridge Secret</FormLabel>
                  <FormControl>
                    <Input
                      type="text"
                      placeholder="Enter bridge secret"
                      className="h-10"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            {error && (
              <p className="w-full text-center font-bold text-red-500">
                Failed to add bridge. Please check your credentials and try
                again.
              </p>
            )}
            <Button
              type="submit"
              size="lg"
              className="mt-1 w-full bg-gradient-to-tr from-indigo-500 to-blue-500 shadow-lg"
              disabled={form.formState.isSubmitting}
            >
              {form.formState.isSubmitting ? (
                <span className="flex items-center gap-2">
                  <svg
                    className="size-4 animate-spin"
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    />
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    />
                  </svg>
                  Adding Bridge...
                </span>
              ) : (
                "Add Bridge"
              )}
            </Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
