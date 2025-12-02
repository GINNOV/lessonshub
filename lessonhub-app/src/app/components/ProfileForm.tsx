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
import { UiLanguagePreference, resolveLocale } from "@/lib/locale";
import { profileCopy, ProfileLocale } from "@/lib/profileCopy";

interface ProfileFormProps {
  userToEdit?: User | null;
  isAdmin?: boolean;
  resolvedLocale?: ProfileLocale;
}
export default function ProfileForm({
  userToEdit,
  isAdmin = false,
  resolvedLocale = "en",
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
  const [locale, setLocale] = useState<ProfileLocale>(resolvedLocale);
  const copy = profileCopy[locale];
  const confirmationText = copy.breakTab.confirmationText;

  // State for the "Taking a Break" feature
  const [isTakingBreak, setIsTakingBreak] = useState(
    user?.isTakingBreak ?? false,
  );
  const [gender, setGender] = useState<Gender>(
    (user as any)?.gender ?? Gender.BINARY,
  );
  const [uiLanguage, setUiLanguage] = useState<UiLanguagePreference>(
    ((user as any)?.uiLanguage as UiLanguagePreference) ?? "device",
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
        ? copy.toasts.breakOn
        : copy.toasts.breakOff;
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
      toast.error(copy.toasts.redeemEmpty);
      return;
    }
    setIsRedeemingCoupon(true);
    const result = await redeemCoupon(couponCode.trim());
    if (result.success) {
      toast.success(result.message || copy.toasts.redeemSuccess);
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
      toast.error(result.error || copy.toasts.redeemError);
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
      uiLanguage,
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
      toast.success(copy.toasts.profileSaved);
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
            uiLanguage,
            ...(user?.role === Role.STUDENT ? { studentBio } : {}),
          } as any,
        });
      }
    } else {
      const data = await response.json();
      toast.error(data.error || copy.toasts.profileError);
    }
    setIsSubmittingProfile(false);
  };

  const handleTeacherBioSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmittingBio(true);

    try {
      const result = await updateTeacherBio(teacherBio);
      if (result.success) {
        toast.success(copy.toasts.aboutSaved);
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
        toast.error(result.error || copy.toasts.aboutError);
      }
    } catch (error) {
      toast.error(copy.toasts.aboutUnexpected);
    }

    setIsSubmittingBio(false);
  };

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      toast.error(copy.toasts.passwordMismatch);
      return;
    }
    setIsSubmittingPassword(true);

    const result = await changePassword(newPassword);

    if (result.success) {
      await signOut({ callbackUrl: "/signin" });
      toast.info(copy.toasts.passwordChanged);
    } else {
      toast.error(result.error || copy.toasts.passwordError);
      setIsSubmittingPassword(false);
    }
  };

  const handleDeleteSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (deleteConfirmation !== confirmationText) {
      toast.error(copy.toasts.deleteConfirmMismatch);
      return;
    }
    setIsDeleting(true);

    const result = await deleteUserAccount();
    if (result.success) {
      await signOut({ callbackUrl: "/" });
      toast.success(copy.toasts.deleteSuccess);
    } else {
      toast.error(result.error || copy.toasts.deleteError);
      setIsDeleting(false);
    }
  };

  const visibleTabs = useMemo(() => {
    const base = [
      { value: "profile", label: copy.tabs.profile, visible: true },
      {
        value: "about",
        label: copy.tabs.about,
        visible: user?.role === Role.TEACHER,
      },
      {
        value: "status",
        label: copy.tabs.billing,
        visible: user?.role === Role.STUDENT,
      },
      { value: "password", label: copy.tabs.password, visible: !isAdmin },
      { value: "delete", label: copy.tabs.delete, visible: !isAdmin },
    ] as const;
    return base.filter((option) => option.visible);
  }, [user?.role, isAdmin, copy.tabs]);

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

  useEffect(() => {
    const preference = (user as any)?.uiLanguage ?? resolvedLocale ?? "device";
    const detectedLocales =
      typeof navigator !== "undefined"
        ? (navigator.languages?.length ? navigator.languages : [navigator.language]).filter(
            Boolean,
          )
        : [];
    const nextLocale = resolveLocale({
      preference: preference as UiLanguagePreference,
      detectedLocales,
      supportedLocales: ["en", "it"] as const,
      fallback: "en",
    }) as ProfileLocale;
    setLocale(nextLocale);
  }, [user, resolvedLocale]);

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
          <h2 className="mb-4 text-2xl font-semibold">{copy.profile.title}</h2>
          <form onSubmit={handleProfileSubmit} className="space-y-5">
            <div className="space-y-4">
              <Label>{copy.profile.picture}</Label>
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
                <p className="text-sm text-gray-500">{copy.profile.uploading}</p>
              )}
            </div>
            <div className="space-y-3">
              <Label
                htmlFor="name"
                className="text-sm font-medium text-gray-700"
              >
                {copy.profile.name}
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
                {copy.profile.email}
              </Label>
              <Input
                id="email"
                type="email"
                value={user?.email || ""}
                disabled
                className="bg-gray-100"
              />
              <p className="text-xs text-gray-500">
                {copy.profile.emailNote}
              </p>
            </div>
            <div className="space-y-2">
              <Label
                htmlFor="gender"
                className="text-sm font-medium text-gray-700"
              >
                {copy.profile.gender}
              </Label>
              <select
                id="gender"
                className="w-full rounded-md border border-gray-300 p-2 shadow-sm"
                value={gender}
                onChange={(e) => setGender(e.target.value as Gender)}
              >
                <option value={Gender.MALE}>{copy.profile.genderOptions.male}</option>
                <option value={Gender.FEMALE}>{copy.profile.genderOptions.female}</option>
                <option value={Gender.BINARY}>{copy.profile.genderOptions.binary}</option>
              </select>
            </div>
            <div className="flex items-center justify-between border rounded-md p-3">
              <div>
                <Label htmlFor="weekly-summary" className="font-medium">
                  {copy.profile.weeklyLabel}
                </Label>
                <p className="text-xs text-gray-500">
                  {copy.profile.weeklyDesc}
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
                {copy.profile.timeZone}
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
                {copy.profile.timeZoneHint}
              </p>
            </div>
            <div className="space-y-2">
              <Label
                htmlFor="uiLanguage"
                className="text-sm font-medium text-gray-700"
              >
                {copy.profile.uiLanguageLabel}
              </Label>
              <select
                id="uiLanguage"
                className="w-full rounded-md border border-gray-300 p-2 shadow-sm"
                value={uiLanguage}
                onChange={(e) =>
                  setUiLanguage(e.target.value as UiLanguagePreference)
                }
              >
                <option value="device">{copy.profile.uiOptions.device}</option>
                <option value="en">{copy.profile.uiOptions.en}</option>
                <option value="it">{copy.profile.uiOptions.it}</option>
              </select>
              <p className="text-xs text-gray-500 mt-1">
                {copy.profile.uiLanguageHint}
              </p>
            </div>
            {user?.role === Role.STUDENT && (
              <div className="space-y-2">
                <Label
                  htmlFor="student-bio"
                  className="text-sm font-medium text-gray-700"
                >
                  {copy.profile.bioLabel}
                </Label>
                <Textarea
                  id="student-bio"
                  value={studentBio}
                  onChange={(e) => setStudentBio(e.target.value)}
                  rows={4}
                  placeholder={copy.profile.bioPlaceholder}
                />
                <p className="text-xs text-gray-500 mt-1">
                  {copy.profile.bioHint}
                </p>
              </div>
            )}
            <Button type="submit" disabled={isSubmittingProfile || isUploading}>
              {isSubmittingProfile ? copy.profile.saving : copy.profile.save}
            </Button>
          </form>
        </div>
      </TabsContent>
      {user?.role === Role.TEACHER && (
        <TabsContent value="about" className="mt-4">
          <div className="mt-4 rounded-lg border bg-white p-6 shadow-md">
            <h2 className="mb-4 text-2xl font-semibold">{copy.about.title}</h2>
            <form onSubmit={handleTeacherBioSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="teacher-bio">
                  {copy.about.label}
                </Label>
                <Textarea
                  id="teacher-bio"
                  value={teacherBio}
                  onChange={(e) => setTeacherBio(e.target.value)}
                  rows={6}
                  placeholder={copy.about.placeholder}
                />
                <p className="text-xs text-gray-500">
                  {copy.about.hint}
                </p>
              </div>
              <Button type="submit" disabled={isSubmittingBio}>
                {isSubmittingBio ? copy.about.saving : copy.about.save}
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
                  <h2 className="text-xl font-semibold">{copy.billing.title}</h2>
                  <p className="text-sm text-gray-500">
                    {copy.billing.subtitle}
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
                  {isPaying ? copy.billing.badgeActive : copy.billing.badgeFree}
                </Badge>
              </div>
              <p className="text-sm text-gray-600">
                {isPaying
                  ? copy.billing.descriptionActive
                  : copy.billing.descriptionFree}
              </p>
              <div className="rounded-md border border-dashed p-4">
                <form
                  onSubmit={handleRedeemCoupon}
                  className="flex flex-col gap-3 sm:flex-row"
                >
                  <Input
                    type="text"
                    placeholder={copy.billing.couponPlaceholder}
                    value={couponCode}
                    onChange={(e) => setCouponCode(e.target.value)}
                    className="flex-1"
                  />
                  <Button type="submit" disabled={isRedeemingCoupon}>
                    {isRedeemingCoupon ? copy.billing.redeeming : copy.billing.redeem}
                  </Button>
                </form>
                <p className="mt-2 text-xs text-gray-500">
                  {copy.billing.couponHint}
                </p>
              </div>
              <p className="text-xs text-gray-500">
                {copy.billing.support}{" "}
                <a
                  href={`mailto:${copy.billing.supportEmail}`}
                  className="underline"
                >
                  {copy.billing.supportEmail}
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
              <h2 className="mb-4 text-2xl font-semibold">{copy.password.title}</h2>
              <form onSubmit={handlePasswordSubmit} className="space-y-5">
                <div className="form-field">
                  <Label htmlFor="newPassword">{copy.password.newLabel}</Label>
                  <Input
                    id="newPassword"
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    required
                  />
                </div>
                <div className="form-field">
                  <Label htmlFor="confirmPassword">{copy.password.confirmLabel}</Label>
                  <Input
                    id="confirmPassword"
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                  />
                </div>
                <Button type="submit" disabled={isSubmittingPassword}>
                  {isSubmittingPassword ? copy.password.saving : copy.password.change}
                </Button>
              </form>
            </div>
          </TabsContent>

          <TabsContent value="delete" className="mt-4">
            <div className="rounded-lg border bg-white p-6 shadow-md mb-4">
              <h2 className="text-xl font-semibold mb-4">{copy.breakTab.title}</h2>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">
                    {copy.breakTab.description}
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
                {copy.breakTab.deleteTitle}
              </h2>
              <p className="text-red-700 mb-4">
                {copy.breakTab.deleteDescription}
              </p>
              <form onSubmit={handleDeleteSubmit} className="space-y-4">
                <div>
                  <Label htmlFor="deleteConfirmation">
                    {copy.breakTab.confirmLabel.replace("{text}", confirmationText)}
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
                  {isDeleting ? copy.breakTab.deleting : copy.breakTab.delete}
                </Button>
              </form>
            </div>
          </TabsContent>
        </>
      )}
    </Tabs>
  );
}
