import { LoginForm } from "@/components/auth/login-form"

export default function LoginPage() {
  return (
    <div className="container mx-auto max-w-md py-16 px-4">
      <div className="space-y-2 text-center">
        <h1 className="text-2xl font-bold">Masuk ke Prodig.id</h1>
        <p className="text-muted-foreground">
          Masuk untuk mulai jualan atau belanja produk digital
        </p>
      </div>
      <div className="mt-8">
        <LoginForm />
      </div>
    </div>
  )
}
