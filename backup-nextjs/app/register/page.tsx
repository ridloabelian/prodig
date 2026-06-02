import { RegisterForm } from "@/components/auth/register-form"

export default function RegisterPage() {
  return (
    <div className="container mx-auto max-w-md py-16 px-4">
      <div className="space-y-2 text-center">
        <h1 className="text-2xl font-bold">Daftar di Prodig.id</h1>
        <p className="text-muted-foreground">
          Daftar gratis sebagai pembeli atau penjual
        </p>
      </div>
      <div className="mt-8">
        <RegisterForm />
      </div>
    </div>
  )
}
