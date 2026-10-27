<script setup lang="ts">
import { cambioPasswordSchema, modificaProfiloSchema } from "@calories-diary/shared";
import type { FormSubmitEvent } from "@nuxt/ui";
import { z } from "zod";

const { sessione, cambiaUsername, cambiaPassword } = useSessione();
const toast = useToast();

function mostraErrore(err: unknown) {
  const errore = err as ErroreNormalizzato;
  toast.add({ title: errore.messaggio, color: "error", icon: "i-lucide-circle-alert" });
}

const statoUsername = ref({ username: sessione.value?.utente.username ?? "" });
const salvaUsernameInCorso = ref(false);
async function salvaUsername({ data }: FormSubmitEvent<z.output<typeof modificaProfiloSchema>>) {
  salvaUsernameInCorso.value = true;
  try {
    await cambiaUsername(data.username);
    statoUsername.value.username = data.username;
    toast.add({ title: "Username aggiornato", color: "success", icon: "i-lucide-check" });
  } catch (err) {
    mostraErrore(err);
  } finally {
    salvaUsernameInCorso.value = false;
  }
}

// The new password is typed twice: there is no reset by email if it gets lost.
const passwordSchema = cambioPasswordSchema
  .extend({ ripeti: z.string() })
  .refine((d) => d.ripeti === d.nuovaPassword, {
    message: "le password non coincidono",
    path: ["ripeti"],
  });
const passwordVuota = () => ({ passwordAttuale: "", nuovaPassword: "", ripeti: "" });
const statoPassword = ref(passwordVuota());
const salvaPasswordInCorso = ref(false);
// Saving is enabled only once every field is valid.
const passwordValida = computed(() => passwordSchema.safeParse(statoPassword.value).success);
const usernameModificabile = computed(
  () =>
    statoUsername.value.username.trim() !== sessione.value?.utente.username &&
    modificaProfiloSchema.safeParse(statoUsername.value).success,
);
async function salvaPassword({ data }: FormSubmitEvent<z.output<typeof passwordSchema>>) {
  salvaPasswordInCorso.value = true;
  try {
    await cambiaPassword({
      passwordAttuale: data.passwordAttuale,
      nuovaPassword: data.nuovaPassword,
    });
    statoPassword.value = passwordVuota();
    toast.add({
      title: "Password aggiornata",
      description: "Gli altri dispositivi dovranno rifare l'accesso.",
      color: "success",
      icon: "i-lucide-check",
    });
  } catch (err) {
    mostraErrore(err);
  } finally {
    salvaPasswordInCorso.value = false;
  }
}
</script>

<template>
  <UContainer class="py-6 max-w-xl space-y-4">
    <h1 class="text-2xl font-bold text-highlighted">Profilo</h1>

    <UCard :ui="{ body: 'space-y-3 sm:p-4' }">
      <h2 class="font-semibold text-highlighted">Username</h2>
      <p class="text-sm text-muted">
        Maiuscole e minuscole restano come le scrivi, ma per accedere non contano.
      </p>
      <UForm
        :schema="modificaProfiloSchema"
        :state="statoUsername"
        class="flex items-start gap-2"
        @submit="salvaUsername"
      >
        <UFormField name="username" class="flex-1">
          <UInput
            v-model="statoUsername.username"
            autocomplete="username"
            autocapitalize="none"
            :spellcheck="false"
            size="xl"
            class="w-full"
          />
        </UFormField>
        <UButton
          type="submit"
          size="xl"
          variant="soft"
          :loading="salvaUsernameInCorso"
          :disabled="!usernameModificabile"
        >
          Salva
        </UButton>
      </UForm>
    </UCard>

    <UCard :ui="{ body: 'space-y-3 sm:p-4' }">
      <div>
        <h2 class="font-semibold text-highlighted">Password</h2>
        <p class="text-sm text-muted">
          Serve quella attuale, anche se è quella ricevuta dall'amministratore.
        </p>
      </div>
      <UForm
        :schema="passwordSchema"
        :state="statoPassword"
        class="space-y-3"
        @submit="salvaPassword"
      >
        <UFormField label="Password attuale" name="passwordAttuale">
          <InputPassword v-model="statoPassword.passwordAttuale" autocomplete="current-password" />
        </UFormField>
        <UFormField label="Nuova password" name="nuovaPassword">
          <InputPassword v-model="statoPassword.nuovaPassword" autocomplete="new-password" />
        </UFormField>
        <UFormField label="Ripeti la nuova password" name="ripeti">
          <InputPassword v-model="statoPassword.ripeti" autocomplete="new-password" />
        </UFormField>
        <UButton
          type="submit"
          size="xl"
          variant="soft"
          block
          :loading="salvaPasswordInCorso"
          :disabled="!passwordValida"
        >
          Cambia password
        </UButton>
      </UForm>
    </UCard>

    <UCard :ui="{ body: 'space-y-3 sm:p-4' }">
      <h2 class="font-semibold text-highlighted">Tema</h2>
      <SelettoreTema />
    </UCard>
  </UContainer>
</template>
