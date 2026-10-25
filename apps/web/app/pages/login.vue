<script setup lang="ts">
import { credenzialiSchema, type Credenziali } from "@calories-diary/shared";
import type { AuthFormField, FormSubmitEvent } from "@nuxt/ui";

definePageMeta({ layout: false });

const { accedi } = useSessione();

const campi: AuthFormField[] = [
  {
    name: "email",
    type: "email",
    label: "Email",
    autocomplete: "username",
    required: true,
    size: "xl",
  },
  {
    name: "password",
    type: "password",
    label: "Password",
    autocomplete: "current-password",
    required: true,
    size: "xl",
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
  <UContainer class="min-h-dvh max-w-md flex flex-col justify-center py-10">
    <div class="flex flex-col items-center gap-3 mb-6">
      <img src="/logo.svg" alt="" class="size-16" />
      <div class="text-center">
        <h1 class="text-2xl font-bold text-highlighted">Calories Diary</h1>
        <p class="text-sm text-muted">Accedi con le tue credenziali.</p>
      </div>
    </div>

    <UCard :ui="{ body: 'sm:p-5' }">
      <UAuthForm
        :schema="credenzialiSchema"
        :fields="campi"
        :submit="{ label: 'Accedi', size: 'xl' }"
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
    </UCard>
  </UContainer>
</template>
