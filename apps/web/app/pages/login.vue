<script setup lang="ts">
import { credenzialiSchema, type Credenziali } from "@calories-diary/shared";
import type { AuthFormField, FormSubmitEvent } from "@nuxt/ui";

definePageMeta({ layout: false });

const { accedi } = useSessione();

const campi: AuthFormField[] = [
  { name: "email", type: "email", label: "Email", autocomplete: "username", required: true },
  {
    name: "password",
    type: "password",
    label: "Password",
    autocomplete: "current-password",
    required: true,
  },
];

const inCorso = ref(false);
const errore = ref<ErroreNormalizzato | null>(null);

async function invia({ data }: FormSubmitEvent<Credenziali>) {
  inCorso.value = true;
  errore.value = null;
  try {
    await accedi(data);
    await navigateTo("/");
  } catch (err) {
    errore.value = err as ErroreNormalizzato;
  } finally {
    inCorso.value = false;
  }
}
</script>

<template>
  <UContainer class="py-10 flex justify-center">
    <UPageCard class="w-full max-w-md">
      <UAuthForm
        :schema="credenzialiSchema"
        :fields="campi"
        title="Calories Diary"
        description="Accedi con le tue credenziali."
        icon="i-lucide-lock"
        :submit="{ label: 'Accedi' }"
        :loading="inCorso"
        @submit="invia"
      >
        <template #validation>
          <UAlert
            v-if="errore"
            color="error"
            variant="subtle"
            icon="i-lucide-circle-alert"
            :title="errore.messaggio"
          />
        </template>
      </UAuthForm>
    </UPageCard>
  </UContainer>
</template>
