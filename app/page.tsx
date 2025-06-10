"use client";

import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";

export default function Home() {
  const router = useRouter();
  
  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-slate-100 dark:from-gray-900 dark:to-gray-950 p-4 md:p-8">
      <main className="max-w-5xl mx-auto mt-8 md:mt-16">
        <div className="flex flex-col items-center text-center mb-12">
          <h1 className="text-3xl md:text-5xl font-bold mb-4 bg-clip-text text-transparent bg-gradient-to-r from-amber-500 to-orange-600">
            EasyGP Health Assistant
          </h1>
          <p className="text-lg text-slate-600 dark:text-slate-300 max-w-2xl">
            Your privacy-first medical assistant for personalized health guidance, powered by local AI.
          </p>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-12">
          <Card className="shadow-md hover:shadow-lg transition-shadow">
            <CardHeader>
              <CardTitle>Privacy First</CardTitle>
              <CardDescription>All your data stays on your device</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-slate-600 dark:text-slate-300">
                Your medical information never leaves your device, with offline-capable 
                AI processing and local database storage.
              </p>
            </CardContent>
          </Card>

          <Card className="shadow-md hover:shadow-lg transition-shadow">
            <CardHeader>
              <CardTitle>Smart Triage</CardTitle>
              <CardDescription>Evidence-based medical pathways</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-slate-600 dark:text-slate-300">
                Access guided clinical pathways like UTI screening with 
                deterministic Bayesian inference for reliable health advice.
              </p>
            </CardContent>
          </Card>
        </div>

        <div className="flex justify-center">
          <Button 
            onClick={() => router.push('/chat')} 
            size="lg" 
            className="bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 text-white px-8 py-6 text-lg"
          >
            Start Chat
          </Button>
        </div>
      </main>
    </div>
  );
}
