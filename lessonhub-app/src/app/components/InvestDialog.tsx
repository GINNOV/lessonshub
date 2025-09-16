// file: src/app/components/InvestDialog.tsx
'use client';

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export default function InvestDialog() {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <button className="text-sm text-gray-200 hover:text-white hover:underline">
          Invest in your future - watch now
        </button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>Invest in Yourself</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="aspect-video overflow-hidden rounded-lg">
            <iframe
              className="w-full h-full"
              src="https://www.youtube.com/embed/kd8zMU3kd0s?si=j0X6hdJqhcXDYn3g&amp;controls=0"
              title="YouTube video player"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
              allowFullScreen
            ></iframe>
          </div>
          <Tabs defaultValue="benefits" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="benefits">🇺🇸 Benefits</TabsTrigger>
              <TabsTrigger value="benefici">🇮🇹 Benefici</TabsTrigger>
            </TabsList>
            <TabsContent value="benefits">
              <div className="space-y-2 rounded-lg border p-4 text-sm max-h-[200px] overflow-y-auto">
                <p>
                  Investing in your education is the single most powerful lever you have to enhance your career and unlock new opportunities. By expanding your skills, you not only boost your confidence but also position yourself to achieve goals you once thought were out of reach. Each new lesson is a step towards a more secure and fulfilling future, opening doors to new professional networks and personal growth.
                </p>
              </div>
            </TabsContent>
            <TabsContent value="benefici">
  <div className="space-y-3 rounded-lg border p-4 text-sm max-h-[200px] overflow-y-auto">
    <h3 className="text-base font-semibold">Perché lessonHUB?</h3>
    <ul className="list-disc pl-5 space-y-1">
      <li>Lezioni brevi (pochi minuti) e pratiche, basate su situazioni reali.</li>
      <li>Meno grammatica, più comunicazione: parla con sicurezza, senza stress.</li>
      <li>Studia ovunque e quando vuoi, in qualsiasi momento della giornata.</li>
      <li>Ideale per viaggi, lavoro online e vita quotidiana.</li>
      <li>Solo <strong>10€ al mese</strong>.</li>
    </ul>
    <p className="pt-2">
      Investire nella tua istruzione è la leva più potente per crescere: con lessonHUB inizi
      a usare l’inglese subito, senza paura degli errori. <span className="font-medium">
      Parla di più, preoccupati di meno.</span>
    </p>
  </div>
</TabsContent>
          </Tabs>
        </div>
      </DialogContent>
    </Dialog>
  );
}