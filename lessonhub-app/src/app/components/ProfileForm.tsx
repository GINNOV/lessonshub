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
import {
  CreditCard,
  Info,
  KeyRound,
  Trash2,
  User as UserIcon,
} from "lucide-react";

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
      {
        value: "profile",
        label: copy.tabs.profile,
        visible: true,
        icon: UserIcon,
      },
      {
        value: "about",
        label: copy.tabs.about,
        visible: user?.role === Role.TEACHER,
        icon: Info,
      },
      {
        value: "status",
        label: copy.tabs.billing,
        visible: user?.role === Role.STUDENT,
        icon: CreditCard,
      },
      {
        value: "password",
        label: copy.tabs.password,
        visible: !isAdmin,
        icon: KeyRound,
      },
      { value: "delete", label: copy.tabs.delete, visible: !isAdmin, icon: Trash2 },
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
      <TabsList className="mb-4 grid h-auto w-full gap-2 rounded-2xl border border-slate-800 bg-slate-950/70 p-1 shadow-[0_10px_30px_rgba(0,0,0,0.35)] [grid-template-columns:repeat(auto-fit,minmax(160px,1fr))]">
        {visibleTabs.map((tab) => (
          <TabsTrigger
            key={tab.value}
            value={tab.value}
            className="rounded-xl border border-slate-700/70 bg-slate-900/60 px-4 py-2.5 text-sm font-semibold text-slate-300 shadow-sm transition hover:border-teal-300/40 hover:bg-slate-900/90 hover:text-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-400/40 data-[state=active]:border-teal-400/70 data-[state=active]:bg-gradient-to-b data-[state=active]:from-slate-800 data-[state=active]:to-slate-900 data-[state=active]:text-teal-200 data-[state=active]:shadow-lg data-[state=active]:ring-1 data-[state=active]:ring-teal-500/30"
          >
            <span className="inline-flex items-center justify-center gap-2">
              <tab.icon className="h-4 w-4" aria-hidden="true" />
              {tab.label}
            </span>
          </TabsTrigger>
        ))}
      </TabsList>

      <TabsContent value="profile" className="mt-4">
        <div className="mt-2 rounded-2xl border border-slate-800/70 bg-slate-950/70 p-6 shadow-2xl backdrop-blur-sm">
          <h2 className="mb-4 text-2xl font-semibold text-slate-100">{copy.profile.title}</h2>
          <form onSubmit={handleProfileSubmit} className="space-y-6">
            <div className="space-y-3">
              <Label className="text-slate-100">{copy.profile.picture}</Label>
              <div className="flex items-center gap-4">
                <Avatar className="h-20 w-20">
                  {image && <AvatarImage src={image} alt={name} />}
                  <AvatarFallback className="text-3xl bg-slate-800 text-slate-200">
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
                <p className="text-sm text-slate-400">{copy.profile.uploading}</p>
              )}
            </div>
            <div className="space-y-3">
              <Label htmlFor="name" className="text-sm font-semibold text-slate-100">
                {copy.profile.name}
              </Label>
              <Input
                id="name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="rounded-xl border-slate-800 bg-slate-900/70 text-slate-100"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email" className="text-sm font-semibold text-slate-100">
                {copy.profile.email}
              </Label>
              <Input
                id="email"
                type="email"
                value={user?.email || ""}
                disabled
                className="bg-slate-900/70 text-slate-200 rounded-xl border border-slate-700/80"
              />
              <p className="text-xs text-slate-400">{copy.profile.emailNote}</p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="gender" className="text-sm font-semibold text-slate-100">
                {copy.profile.gender}
              </Label>
              <select
                id="gender"
                className="w-full rounded-xl border border-slate-800 bg-slate-900/70 p-3 text-slate-100 shadow-sm"
                value={gender}
                onChange={(e) => setGender(e.target.value as Gender)}
              >
                <option value={Gender.MALE}>{copy.profile.genderOptions.male}</option>
                <option value={Gender.FEMALE}>{copy.profile.genderOptions.female}</option>
                <option value={Gender.BINARY}>{copy.profile.genderOptions.binary}</option>
              </select>
            </div>
            <div className="flex items-center justify-between rounded-xl border border-slate-800 bg-slate-900/70 p-3">
              <div className="space-y-1">
                <Label htmlFor="weekly-summary" className="font-semibold text-slate-200">
                  {copy.profile.weeklyLabel}
                </Label>
                <p className="text-xs text-slate-400">
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
              <Label htmlFor="timeZone" className="text-sm font-semibold text-slate-100">
                {copy.profile.timeZone}
              </Label>
              {tzList.length > 0 ? (
                <select
                  id="timeZone"
                  className="w-full rounded-xl border border-slate-800 bg-slate-900/70 p-3 text-slate-100 shadow-sm"
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
                  className="rounded-xl border-slate-800 bg-slate-900/70 text-slate-100"
                />
              )}
              <p className="text-xs text-slate-500 mt-1">{copy.profile.timeZoneHint}</p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="uiLanguage" className="text-sm font-semibold text-slate-100">
                {copy.profile.uiLanguageLabel}
              </Label>
              <select
                id="uiLanguage"
                className="w-full rounded-xl border border-slate-800 bg-slate-900/70 p-3 text-slate-100 shadow-sm"
                value={uiLanguage}
                onChange={(e) =>
                  setUiLanguage(e.target.value as UiLanguagePreference)
                }
              >
                <option value="device">{copy.profile.uiOptions.device}</option>
                <option value="en">{copy.profile.uiOptions.en}</option>
                <option value="it">{copy.profile.uiOptions.it}</option>
              </select>
              <p className="text-xs text-slate-500 mt-1">{copy.profile.uiLanguageHint}</p>
            </div>
            {user?.role === Role.STUDENT && (
              <div className="space-y-2">
                <Label htmlFor="student-bio" className="text-sm font-semibold text-slate-100">
                  {copy.profile.bioLabel}
                </Label>
                <Textarea
                  id="student-bio"
                  value={studentBio}
                  onChange={(e) => setStudentBio(e.target.value)}
                  rows={4}
                  placeholder={copy.profile.bioPlaceholder}
                  className="rounded-xl border-slate-800 bg-slate-900/70 text-slate-100"
                />
                <p className="text-xs text-slate-500 mt-1">{copy.profile.bioHint}</p>
              </div>
            )}
            <Button
              type="submit"
              disabled={isSubmittingProfile || isUploading}
              className="border border-teal-300/50 bg-gradient-to-r from-teal-400 to-emerald-500 text-slate-950 shadow-[0_12px_35px_rgba(45,212,191,0.35)] hover:brightness-110"
            >
              {isSubmittingProfile ? copy.profile.saving : copy.profile.save}
            </Button>
          </form>
        </div>
      </TabsContent>
      {user?.role === Role.TEACHER && (
        <TabsContent value="about" className="mt-4">
          <div className="mt-2 rounded-2xl border border-slate-800/70 bg-slate-950/70 p-6 shadow-2xl backdrop-blur-sm">
            <h2 className="mb-4 text-2xl font-semibold text-slate-100">{copy.about.title}</h2>
            <form onSubmit={handleTeacherBioSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="teacher-bio" className="text-sm font-semibold text-slate-100">
                  {copy.about.label}
                </Label>
                <Textarea
                  id="teacher-bio"
                  value={teacherBio}
                  onChange={(e) => setTeacherBio(e.target.value)}
                  rows={6}
                  placeholder={copy.about.placeholder}
                  className="rounded-xl border-slate-800 bg-slate-900/70 text-slate-100"
                />
                <p className="text-xs text-slate-500">
                  {copy.about.hint}
                </p>
              </div>
              <Button
                type="submit"
                disabled={isSubmittingBio}
                className="border border-teal-300/50 bg-gradient-to-r from-teal-400 to-emerald-500 text-slate-950 shadow-[0_12px_35px_rgba(45,212,191,0.35)] hover:brightness-110"
              >
                {isSubmittingBio ? copy.about.saving : copy.about.save}
              </Button>
            </form>
          </div>
        </TabsContent>
      )}

      {user?.role === Role.STUDENT && (
        <TabsContent value="status" className="mt-4">
          <div className="mt-2 space-y-4">
            <div className="space-y-4 rounded-2xl border border-slate-800/70 bg-slate-950/70 p-6 shadow-2xl backdrop-blur-sm">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-semibold text-slate-100">{copy.billing.title}</h2>
                  <p className="text-sm text-slate-400">{copy.billing.subtitle}</p>
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
              <p className="text-sm text-slate-200">
                {isPaying
                  ? copy.billing.descriptionActive
                  : copy.billing.descriptionFree}
              </p>
              <div className="rounded-xl border border-dashed border-slate-700 bg-slate-900/60 p-4">
                <form
                  onSubmit={handleRedeemCoupon}
                  className="flex flex-col gap-3 sm:flex-row"
                >
                  <Input
                    type="text"
                    placeholder={copy.billing.couponPlaceholder}
                    value={couponCode}
                    onChange={(e) => setCouponCode(e.target.value)}
                    className="flex-1 rounded-xl border-slate-800 bg-slate-900/70 text-slate-100"
                  />
                  <Button
                    type="submit"
                    disabled={isRedeemingCoupon}
                    className="border border-teal-300/50 bg-gradient-to-r from-teal-400 to-emerald-500 text-slate-950 shadow-[0_12px_35px_rgba(45,212,191,0.35)] hover:brightness-110"
                  >
                    {isRedeemingCoupon ? copy.billing.redeeming : copy.billing.redeem}
                  </Button>
                </form>
                <p className="mt-2 text-xs text-slate-500">{copy.billing.couponHint}</p>
              </div>
              <p className="text-xs text-slate-500">
                {copy.billing.support}{" "}
                <a
                  href={`mailto:${copy.billing.supportEmail}`}
                  className="underline text-teal-200"
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
            <div className="mt-2 rounded-2xl border border-slate-800/70 bg-slate-950/80 p-6 shadow-2xl backdrop-blur">
              <h2 className="mb-4 text-2xl font-semibold text-slate-100">{copy.password.title}</h2>
              <form onSubmit={handlePasswordSubmit} className="space-y-5">
                <div className="form-field">
                  <Label htmlFor="newPassword" className="text-slate-100 text-base">{copy.password.newLabel}</Label>
                  <Input
                    id="newPassword"
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    required
                    className="rounded-xl border-slate-800 bg-slate-900/70 text-slate-100"
                  />
                </div>
                <div className="form-field">
                  <Label htmlFor="confirmPassword" className="text-slate-100 text-base">{copy.password.confirmLabel}</Label>
                  <Input
                    id="confirmPassword"
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                    className="rounded-xl border-slate-800 bg-slate-900/70 text-slate-100"
                  />
                </div>
                <Button
                  type="submit"
                  disabled={isSubmittingPassword}
                  className="group relative overflow-hidden rounded-xl border border-emerald-300/50 bg-gradient-to-r from-emerald-500 to-teal-400 text-slate-950 shadow-[0_16px_40px_rgba(16,185,129,0.35)] transition hover:brightness-110"
                >
                  <span className="absolute inset-0 bg-emerald-400/30 blur-2xl opacity-0 transition-opacity group-hover:opacity-100" />
                  <span className="relative">
                    {isSubmittingPassword ? copy.password.saving : copy.password.change}
                  </span>
                </Button>
              </form>
            </div>
          </TabsContent>

          <TabsContent value="delete" className="mt-4">
            <div className="mb-4 rounded-2xl border border-slate-800/70 bg-slate-950/70 p-6 shadow-2xl backdrop-blur-sm">
              <h2 className="text-xl font-semibold mb-4 text-slate-100">{copy.breakTab.title}</h2>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-400">{copy.breakTab.description}</p>
                </div>
                <Switch
                  id="taking-a-break"
                  checked={isTakingBreak}
                  onCheckedChange={handleToggleBreak}
                />
              </div>
            </div>
            <div className="rounded-2xl border border-red-500/30 bg-gradient-to-b from-red-950/80 via-red-950/60 to-slate-950/80 p-6 shadow-2xl">
              <h2 className="text-2xl font-semibold text-red-50 mb-4">
                {copy.breakTab.deleteTitle}
              </h2>
              <p className="text-red-100 mb-4">
                {copy.breakTab.deleteDescription}
              </p>
              <form onSubmit={handleDeleteSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="deleteConfirmation" className="text-red-50">
                    {copy.breakTab.confirmLabel.replace("{text}", confirmationText)}
                  </Label>
                  <Input
                    id="deleteConfirmation"
                    type="text"
                    value={deleteConfirmation}
                    onChange={(e) => setDeleteConfirmation(e.target.value)}
                    required
                    className="rounded-xl border-red-500/50 bg-red-950/80 text-red-50 placeholder:text-red-200"
                  />
                </div>
                <Button
                  type="submit"
                  variant="destructive"
                  disabled={
                    isDeleting || deleteConfirmation !== confirmationText
                  }
                  className="bg-red-600 text-white hover:bg-red-500"
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
