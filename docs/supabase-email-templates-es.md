# Plantillas de Email de Supabase - Español

Ir a **Supabase Dashboard > Authentication > Email Templates** y reemplazar cada plantilla.

---

## 1. Confirm Sign Up (Confirmar registro)

**Subject:** Confirmá tu registro

**Body:**

```html
<h2>Confirmá tu registro</h2>
<p>Seguí este enlace para confirmar tu cuenta:</p>
<p><a href="{{ .ConfirmationURL }}">Confirmar cuenta</a></p>
```

---

## 2. Invite User (Invitar usuario)

**Subject:** Fuiste invitado

**Body:**

```html
<h2>Fuiste invitado</h2>
<p>Fuiste invitado a crear una cuenta. Seguí este enlace para aceptar la invitación:</p>
<p><a href="{{ .ConfirmationURL }}">Aceptar invitación</a></p>
```

---

## 3. Magic Link (Enlace mágico)

**Subject:** Tu enlace de acceso

**Body:**

```html
<h2>Enlace de acceso</h2>
<p>Seguí este enlace para iniciar sesión:</p>
<p><a href="{{ .ConfirmationURL }}">Iniciar sesión</a></p>
```

---

## 4. Reset Password (Restablecer contraseña)

**Subject:** Restablecé tu contraseña

**Body:**

```html
<h2>Restablecé tu contraseña</h2>
<p>Seguí este enlace para restablecer tu contraseña:</p>
<p><a href="{{ .ConfirmationURL }}">Restablecer contraseña</a></p>
```

---

## 5. Change Email Address (Cambiar email)

**Subject:** Confirmá el cambio de email

**Body:**

```html
<h2>Confirmá el cambio de email</h2>
<p>Seguí este enlace para confirmar el cambio de tu dirección de email a {{ .NewEmail }}:</p>
<p><a href="{{ .ConfirmationURL }}">Confirmar cambio de email</a></p>
```

---

## 6. Reauthentication (Reautenticación)

**Subject:** Código de verificación

**Body:**

```html
<h2>Código de verificación</h2>
<p>Ingresá este código para confirmar tu identidad:</p>
<p><strong>{{ .Token }}</strong></p>
```
