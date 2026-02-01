import { Header } from "@/components/layout/Header";
import { ProjectInputForm } from "@/components/forms/ProjectInputForm";

export default function CreatePage() {
  return (
    <div className="min-h-screen flex flex-col">
      <Header />

      <main className="flex-1 flex justify-center pb-16">
        <div className="w-full max-w-[640px] px-6">
          <ProjectInputForm />
        </div>
      </main>
    </div>
  );
}
