// file: src/app/components/ProfileForm.tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import { useSession, signOut } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  changePassword,
  deleteUserAccount,
  toggleTakingABreak,
} from "@/actions/userActions";
import { toggleTakingABreakForUser } from "@/actions/adminActions";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { User, Role, Gender } from "@prisma/client";
import { toast } from "sonner";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { updateTeacherBio } from "@/actions/teacherActions";
import { redeemCoupon } from "@/actions/billingActions";
import { Badge } from "@/components/ui/badge";
import FileUploadButton from "@/components/FileUploadButton";
import { useSearchParams } from "next/navigation";

interface ProfileFormProps {
  userToEdit?: User | null;
  isAdmin?: boolean;
}

export default function ProfileForm({
  userToEdit,
  isAdmin = false,
}: ProfileFormProps) {
  const { data: session, update } = useSession();
  const user = userToEdit || session?.user;
  const searchParams = useSearchParams();
  const initialTabFromUrl = searchParams?.get("tab");
  const normalizedTab =
    initialTabFromUrl === "billing" ? "status" : initialTabFromUrl;

  // State from your original component
  const [name, setName] = useState(user?.name ?? "");
  const [image, setImage] = useState(user?.image ?? null);
  const [isUploading, setIsUploading] = useState(false);
  const [isSubmittingProfile, setIsSubmittingProfile] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isSubmittingPassword, setIsSubmittingPassword] = useState(false);
  const [deleteConfirmation, setDeleteConfirmation] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);
  const confirmationText = "Yes, I am sure.";

  // State for the "Taking a Break" feature
  const [isTakingBreak, setIsTakingBreak] = useState(
    user?.isTakingBreak ?? false,
  );
  const [gender, setGender] = useState<Gender>(
    (user as any)?.gender ?? Gender.BINARY,
  );
  const [weeklySummaryOptOut, setWeeklySummaryOptOut] = useState<boolean>(
    (user as any)?.weeklySummaryOptOut ?? false,
  );

  // Timezone state
  const defaultTz = (() => {
    try {
      return (
        (user as any)?.timeZone ||
        Intl.DateTimeFormat().resolvedOptions().timeZone
      );
    } catch {
      return (user as any)?.timeZone || "UTC";
    }
  })();
  const [timeZone, setTimeZone] = useState<string>(defaultTz);
  const tzList: string[] = (() => {
    try {
      // @ts-ignore
      return typeof Intl !== "undefined" && (Intl as any).supportedValuesOf
        ? (Intl as any).supportedValuesOf("timeZone")
        : [];
    } catch {
      return [];
    }
  })();
  const [teacherBio, setTeacherBio] = useState(user?.teacherBio ?? "");
  const [studentBio, setStudentBio] = useState(user?.studentBio ?? "");
  const [isSubmittingBio, setIsSubmittingBio] = useState(false);
  const [isPaying, setIsPaying] = useState(user?.isPaying ?? false);
  const [couponCode, setCouponCode] = useState("");
  const [isRedeemingCoupon, setIsRedeemingCoupon] = useState(false);

  // All handlers from your original component are preserved
  const getInitials = (name: string | null | undefined): string => {
    if (!name) return "??";
    const names = name.split(" ");
    return names.length > 1
      ? `${names[0][0]}${names[names.length - 1][0]}`.toUpperCase()
      : name.substring(0, 2).toUpperCase();
  };

  const handleToggleBreak = async (isChecked: boolean) => {
    setIsTakingBreak(isChecked);
    const result =
      isAdmin && userToEdit
        ? await toggleTakingABreakForUser(userToEdit.id)
        : await toggleTakingABreak();

    if (result.success) {
      const message = result.isTakingBreak
        ? "Lessons are now paused."
        : "Lessons are now active.";
      toast.success(message);
      if (!isAdmin) {
        await update({
          ...session,
          user: { ...session?.user, isTakingBreak: isChecked },
        });
      }
    } else {
      toast.error(result.error);
      setIsTakingBreak(!isChecked);
    }
  };

  const handleRedeemCoupon = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!couponCode.trim()) {
      toast.error("Enter your coupon code first.");
      return;
    }
    setIsRedeemingCoupon(true);
    const result = await redeemCoupon(couponCode.trim());
    if (result.success) {
      toast.success(result.message || "Coupon applied successfully!");
      setCouponCode("");
      setIsPaying(true);
      if (!isAdmin && session) {
        await update({
          ...session,
          user: {
            ...session.user,
            isPaying: true,
          } as any,
        });
      }
    } else {
      toast.error(result.error || "Unable to redeem coupon.");
    }
    setIsRedeemingCoupon(false);
  };

  const handleImageUpload = async (
    event: React.ChangeEvent<HTMLInputElement>,
  ) => {
    event.preventDefault();
    const file = event.target.files?.[0];
    if (!file) return;

    setIsUploading(true);

    try {
      const response = await fetch(`/api/upload?filename=${file.name}`, {
        method: "POST",
        body: file,
      });
      if (!response.ok) throw new Error("Upload failed.");
      const newBlob = await response.json();
      setImage(newBlob.url);
      toast.success("Image uploaded, save changes to apply.");
    } catch (err: unknown) {
      toast.error((err as Error).message);
    } finally {
      setIsUploading(false);
    }
  };

  const handleProfileSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmittingProfile(true);

    const apiRoute =
      isAdmin && userToEdit ? `/api/profile/${userToEdit.id}` : "/api/profile";

    const payload: Record<string, unknown> = {
      name,
      image,
      timeZone,
      gender,
      weeklySummaryOptOut,
    };
    if (user?.role === Role.STUDENT) {
      payload.studentBio = studentBio;
    }

    const response = await fetch(apiRoute, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (response.ok) {
      toast.success("Profile updated successfully!");
      if (!isAdmin) {
        await update({
          ...session,
          user: {
            ...session?.user,
            name,
            image,
            timeZone,
            gender,
            weeklySummaryOptOut,
            ...(user?.role === Role.STUDENT ? { studentBio } : {}),
          } as any,
        });
      }
    } else {
      const data = await response.json();
      toast.error(data.error || "Failed to update profile.");
    }
    setIsSubmittingProfile(false);
  };

  const handleTeacherBioSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmittingBio(true);

    try {
      const result = await updateTeacherBio(teacherBio);
      if (result.success) {
        toast.success("About me updated successfully!");
        if (!isAdmin && session) {
          await update({
            ...session,
            user: {
              ...session.user,
              teacherBio,
            } as any,
          });
        }
      } else {
        toast.error(result.error || "Failed to update About me.");
      }
    } catch (error) {
      toast.error("An unexpected error occurred.");
    }

    setIsSubmittingBio(false);
  };

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      toast.error("New passwords do not match.");
      return;
    }
    setIsSubmittingPassword(true);

    const result = await changePassword(newPassword);

    if (result.success) {
      await signOut({ callbackUrl: "/signin" });
      toast.info("Password changed successfully. Please sign in again.");
    } else {
      toast.error(result.error || "Failed to change password.");
      setIsSubmittingPassword(false);
    }
  };

  const handleDeleteSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (deleteConfirmation !== confirmationText) {
      toast.error("Please type the confirmation text exactly as shown.");
      return;
    }
    setIsDeleting(true);

    const result = await deleteUserAccount();
    if (result.success) {
      await signOut({ callbackUrl: "/" });
      toast.success("Account deleted successfully.");
    } else {
      toast.error(result.error || "Failed to delete account.");
      setIsDeleting(false);
    }
  };

  const visibleTabs = useMemo(() => {
    const base = [
      { value: "profile", label: "Profile", visible: true },
      {
        value: "about",
        label: "About me",
        visible: user?.role === Role.TEACHER,
      },
      {
        value: "status",
        label: "Billing",
        visible: user?.role === Role.STUDENT,
      },
      { value: "password", label: "Password", visible: !isAdmin },
      { value: "delete", label: "Break(up) time", visible: !isAdmin },
    ] as const;
    return base.filter((option) => option.visible);
  }, [user?.role, isAdmin]);

  const defaultTab = useMemo(() => {
    if (
      normalizedTab &&
      visibleTabs.some((tab) => tab.value === normalizedTab)
    ) {
      return normalizedTab;
    }
    return "profile";
  }, [normalizedTab, visibleTabs]);

  const [activeTab, setActiveTab] = useState<string>(defaultTab);

  useEffect(() => {
    setActiveTab(defaultTab);
  }, [defaultTab]);

  return (
    <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
      <TabsList className="mb-2 flex w-full flex-wrap gap-2 rounded-2xl bg-gray-50 p-1 shadow-inner h-auto">
        {visibleTabs.map((tab) => (
          <TabsTrigger
            key={tab.value}
            value={tab.value}
            className="flex-1 min-w-[140px] rounded-xl border border-transparent px-3 py-2 text-sm font-semibold text-gray-500 transition data-[state=active]:border-indigo-200 data-[state=active]:bg-white data-[state=active]:text-indigo-700 data-[state=active]:shadow-md data-[state=active]:ring-1 data-[state=active]:ring-indigo-100 md:flex-none"
          >
            {tab.label}
          </TabsTrigger>
        ))}
      </TabsList>

      <TabsContent value="profile" className="mt-4">
        <div className="mt-4 rounded-lg border bg-white p-6 shadow-md">
          <h2 className="mb-4 text-2xl font-semibold">Update Profile</h2>
          <form onSubmit={handleProfileSubmit} className="space-y-5">
            <div className="space-y-4">
              <Label>Profile Picture</Label>
              <div className="flex items-center gap-4">
                <Avatar className="h-20 w-20">
                  {image && <AvatarImage src={image} alt={name} />}
                  <AvatarFallback className="text-3xl">
                    {getInitials(name)}
                  </AvatarFallback>
                </Avatar>
                <FileUploadButton
                  id="picture"
                  onChange={handleImageUpload}
                  disabled={isSubmittingProfile || isUploading}
                  accept="image/*"
                  className="w-auto"
                />
              </div>
              {isUploading && (
                <p className="text-sm text-gray-500">Uploading...</p>
              )}
            </div>
            <div className="space-y-3">
              <Label
                htmlFor="name"
                className="text-sm font-medium text-gray-700"
              >
                Name
              </Label>
              <Input
                id="name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label
                htmlFor="email"
                className="text-sm font-medium text-gray-700"
              >
                Email
              </Label>
              <Input
                id="email"
                type="email"
                value={user?.email || ""}
                disabled
                className="bg-gray-100"
              />
              <p className="text-xs text-gray-500">
                Email addresses cannot be changed.
              </p>
            </div>
            <div className="space-y-2">
              <Label
                htmlFor="gender"
                className="text-sm font-medium text-gray-700"
              >
                Gender
              </Label>
              <select
                id="gender"
                className="w-full rounded-md border border-gray-300 p-2 shadow-sm"
                value={gender}
                onChange={(e) => setGender(e.target.value as Gender)}
              >
                <option value={Gender.MALE}>male</option>
                <option value={Gender.FEMALE}>female</option>
                <option value={Gender.BINARY}>binary</option>
              </select>
            </div>
            <div className="flex items-center justify-between border rounded-md p-3">
              <div>
                <Label htmlFor="weekly-summary" className="font-medium">
                  Weekly summary emails
                </Label>
                <p className="text-xs text-gray-500">
                  Receive a Sunday recap of your accomplishments.
                </p>
              </div>
              <Switch
                id="weekly-summary"
                checked={!weeklySummaryOptOut}
                onCheckedChange={(v) => setWeeklySummaryOptOut(!v)}
              />
            </div>
            <div className="space-y-2">
              <Label
                htmlFor="timeZone"
                className="text-sm font-medium text-gray-700"
              >
                Timezone
              </Label>
              {tzList.length > 0 ? (
                <select
                  id="timeZone"
                  className="w-full rounded-md border border-gray-300 p-2 shadow-sm"
                  value={timeZone}
                  onChange={(e) => setTimeZone(e.target.value)}
                >
                  {tzList.map((tz) => (
                    <option key={tz} value={tz}>
                      {tz}
                    </option>
                  ))}
                </select>
              ) : (
                <Input
                  id="timeZone"
                  type="text"
                  value={timeZone}
                  onChange={(e) => setTimeZone(e.target.value)}
                />
              )}
              <p className="text-xs text-gray-500 mt-1">
                Used to format deadlines in emails and reminders.
              </p>
            </div>
            {user?.role === Role.STUDENT && (
              <div className="space-y-2">
                <Label
                  htmlFor="student-bio"
                  className="text-sm font-medium text-gray-700"
                >
                  Bio
                </Label>
                <Textarea
                  id="student-bio"
                  value={studentBio}
                  onChange={(e) => setStudentBio(e.target.value)}
                  rows={4}
                  placeholder="Share a fun fact, learning goal, or what motivates you."
                />
                <p className="text-xs text-gray-500 mt-1">
                  Shown on your leaderboard profile so classmates can get to
                  know you.
                </p>
              </div>
            )}
            <Button type="submit" disabled={isSubmittingProfile || isUploading}>
              {isSubmittingProfile ? "Saving..." : "Save Profile Changes"}
            </Button>
          </form>
        </div>
      </TabsContent>
      {user?.role === Role.TEACHER && (
        <TabsContent value="about" className="mt-4">
          <div className="mt-4 rounded-lg border bg-white p-6 shadow-md">
            <h2 className="mb-4 text-2xl font-semibold">About Me</h2>
            <form onSubmit={handleTeacherBioSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="teacher-bio">
                  Share something with your students
                </Label>
                <Textarea
                  id="teacher-bio"
                  value={teacherBio}
                  onChange={(e) => setTeacherBio(e.target.value)}
                  rows={6}
                  placeholder="Introduce yourself, highlight your teaching style, or share what students can expect from your lessons."
                />
                <p className="text-xs text-gray-500">
                  This message appears on the teachers directory for all
                  logged-in students.
                </p>
              </div>
              <Button type="submit" disabled={isSubmittingBio}>
                {isSubmittingBio ? "Saving..." : "Save About Me"}
              </Button>
            </form>
          </div>
        </TabsContent>
      )}

      {user?.role === Role.STUDENT && (
        <TabsContent value="status" className="mt-4">
          <div className="mt-4 space-y-4">
            <div className="rounded-lg border bg-white p-6 shadow-md space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-semibold">Current Plan</h2>
                  <p className="text-sm text-gray-500">
                    Your plan includes HUB Guides.
                  </p>
                </div>
                <Badge
                  variant={isPaying ? "success" : "default"}
                  className={
                    isPaying
                      ? undefined
                      : "bg-yellow-100 text-yellow-800 border border-yellow-300"
                  }
                >
                  {isPaying ? "Active" : "Free"}
                </Badge>
              </div>
              <p className="text-sm text-gray-600">
                {isPaying
                  ? "Your plan has premium content sponsored by your assigned teacher."
                  : "Unlock Hub Guides and personal tutoring by subscribing for just 10 euros at month or redeeming a prepaid coupon. Ask your teacher for one!"}
              </p>
              <div className="rounded-md border border-dashed p-4">
                <form
                  onSubmit={handleRedeemCoupon}
                  className="flex flex-col gap-3 sm:flex-row"
                >
                  <Input
                    type="text"
                    placeholder="Enter coupon code"
                    value={couponCode}
                    onChange={(e) => setCouponCode(e.target.value)}
                    className="flex-1"
                  />
                  <Button type="submit" disabled={isRedeemingCoupon}>
                    {isRedeemingCoupon ? "Redeeming…" : "Redeem"}
                  </Button>
                </form>
                <p className="mt-2 text-xs text-gray-500">
                  Received a code from your teacher or the billing team? Enter
                  it above to activate your plan.
                </p>
              </div>
              <p className="text-xs text-gray-500">
                Need help with billing? Email{" "}
                <a href="mailto:billing@quantifythis.com" className="underline">
                  billing@quantifythis.com
                </a>
                .
              </p>
            </div>
          </div>
        </TabsContent>
      )}

      {!isAdmin && (
        <>
          <TabsContent value="password" className="mt-4">
            <div className="mt-4 rounded-lg border bg-white p-6 shadow-md">
              <h2 className="mb-4 text-2xl font-semibold">Change Password</h2>
              <form onSubmit={handlePasswordSubmit} className="space-y-5">
                <div className="form-field">
                  <Label htmlFor="newPassword">New Password</Label>
                  <Input
                    id="newPassword"
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    required
                  />
                </div>
                <div className="form-field">
                  <Label htmlFor="confirmPassword">Confirm New Password</Label>
                  <Input
                    id="confirmPassword"
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                  />
                </div>
                <Button type="submit" disabled={isSubmittingPassword}>
                  {isSubmittingPassword ? "Saving..." : "Change Password"}
                </Button>
              </form>
            </div>
          </TabsContent>

          <TabsContent value="delete" className="mt-4">
            <div className="rounded-lg border bg-white p-6 shadow-md mb-4">
              <h2 className="text-xl font-semibold mb-4">Take a break</h2>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">
                    Pause all lesson assignments on your dashboard. While on a
                    break you charged only 20% of the current assigned plan. We
                    have cost to run the show too.
                  </p>
                </div>
                <Switch
                  id="taking-a-break"
                  checked={isTakingBreak}
                  onCheckedChange={handleToggleBreak}
                />
              </div>
            </div>
            <div className="rounded-lg border border-red-200 bg-red-50 p-6 shadow-md">
              <h2 className="text-2xl font-semibold text-red-800 mb-4">
                Delete Account
              </h2>
              <p className="text-red-700 mb-4">
                This action is irreversible. All your lessons, assignments, and
                personal data will be permanently deleted.
              </p>
              <form onSubmit={handleDeleteSubmit} className="space-y-4">
                <div>
                  <Label htmlFor="deleteConfirmation">
                    To confirm, please type: &quot;{confirmationText}&quot;
                  </Label>
                  <Input
                    id="deleteConfirmation"
                    type="text"
                    value={deleteConfirmation}
                    onChange={(e) => setDeleteConfirmation(e.target.value)}
                    required
                  />
                </div>
                <Button
                  type="submit"
                  variant="destructive"
                  disabled={
                    isDeleting || deleteConfirmation !== confirmationText
                  }
                >
                  {isDeleting ? "Deleting..." : "Delete My Account"}
                </Button>
              </form>
            </div>
          </TabsContent>
        </>
      )}
    </Tabs>
  );
}
