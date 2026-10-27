<script setup lang="ts">
import {
  nuovaPasswordSchema,
  nuovoUtenteSchema,
  usernameSchema,
  type Utente,
} from "@calories-diary/shared";
import type { FormSubmitEvent } from "@nuxt/ui";
import { z } from "zod";

const { sessione } = useSessione();
const utenti = useUtenti();
const toast = useToast();

const { data, status, error, refresh } = useAsyncData("utenti", () => utenti.elenca());
const errore = computed(() => (error.value ? normalizzaErrore(error.value) : null));

function mostraErrore(err: unknown) {
  const e = err as ErroreNormalizzato;
  toast.add({ title: e.messaggio, color: "error", icon: "i-lucide-circle-alert" });
}

// One modal for both: `inModifica` null means a new user.
const aperta = ref(false);
const inModifica = ref<Utente | null>(null);
const stato = ref({ username: "", password: "" });
// Editing, an empty password leaves it unchanged.
const schemaModifica = z.object({
  username: usernameSchema,
  password: nuovaPasswordSchema.or(z.literal("")),
});
const schema = computed(() => (inModifica.value ? schemaModifica : nuovoUtenteSchema));

function apri(utente: Utente | null) {
  inModifica.value = utente;
  stato.value = { username: utente?.username ?? "", password: "" };
  aperta.value = true;
}

const inCorso = ref(false);
async function esegui(azione: () => Promise<void>, messaggio: string) {
  inCorso.value = true;
  try {
    await azione();
    aperta.value = false;
    toast.add({ title: messaggio, color: "success", icon: "i-lucide-check" });
    await refresh();
  } catch (err) {
    mostraErrore(err);
  } finally {
    inCorso.value = false;
  }
}

function salva({ data: dati }: FormSubmitEvent<{ username: string; password: string }>) {
  const utente = inModifica.value;
  if (!utente) {
    return esegui(async () => {
      await utenti.crea(dati);
    }, "Utente creato");
  }
  return esegui(async () => {
    await utenti.modifica(utente.id, {
      username: dati.username !== utente.username ? dati.username : undefined,
      password: dati.password || undefined,
    });
  }, "Utente aggiornato");
}

function elimina() {
  const utente = inModifica.value;
  if (!utente) return;
  const conferma =
    `Eliminare ${utente.username}? Il suo diario viene cancellato per sempre, ` +
    "insieme agli alimenti che ha creato e che nessun altro ha usato.";
  if (!confirm(conferma)) return;
  return esegui(() => utenti.elimina(utente.id), "Utente eliminato");
}

const nienteDaSalvare = computed(
  () =>
    !!inModifica.value &&
    !stato.value.password &&
    stato.value.username.trim() === inModifica.value.username,
);
</script>

<template>
  <UContainer class="py-6 max-w-xl space-y-3">
    <div class="flex items-center justify-between gap-2">
      <h1 class="text-2xl font-bold text-highlighted">Utenti</h1>
      <UButton icon="i-lucide-plus" @click="apri(null)">Nuovo</UButton>
    </div>

    <UAlert
      v-if="errore"
      color="error"
      variant="subtle"
      icon="i-lucide-circle-alert"
      :title="errore.messaggio"
      :actions="[{ label: 'Riprova', onClick: () => refresh() }]"
    />
    <div v-else-if="status === 'pending' && !data" class="space-y-3">
      <USkeleton v-for="i in 3" :key="i" class="h-14 w-full rounded-lg" />
    </div>
    <UCard v-else-if="data" :ui="{ body: 'py-0 sm:py-0 sm:px-4' }">
      <div class="divide-y divide-default">
        <div v-for="u in data" :key="u.id" class="flex items-center gap-3 py-3 min-h-14">
          <UIcon name="i-lucide-user" class="size-5 shrink-0 text-muted" />
          <div class="flex-1 min-w-0 flex items-center gap-2">
            <span class="truncate font-medium text-highlighted">{{ u.username }}</span>
            <UBadge v-if="u.ruolo === 'admin'" variant="soft" size="sm" class="rounded-full">
              Admin
            </UBadge>
          </div>
          <!-- Your own account is changed from the profile, with the current password. -->
          <UButton
            v-if="u.id === sessione?.utente.id"
            to="/profilo"
            variant="ghost"
            color="neutral"
            size="sm"
          >
            Il tuo profilo
          </UButton>
          <UButton
            v-else
            icon="i-lucide-pencil"
            variant="ghost"
            color="neutral"
            :aria-label="`Modifica ${u.username}`"
            @click="apri(u)"
          />
        </div>
      </div>
    </UCard>

    <p class="text-sm text-muted">
      Gli amministratori si creano solo da riga di comando. Chi riceve una password da te può
      cambiarla dal proprio profilo.
    </p>

    <UModal v-model:open="aperta" :title="inModifica ? inModifica.username : 'Nuovo utente'">
      <template #body>
        <UForm :schema="schema" :state="stato" class="space-y-4" @submit="salva">
          <UFormField label="Username" name="username">
            <UInput
              v-model="stato.username"
              autocomplete="off"
              autocapitalize="none"
              :spellcheck="false"
              size="xl"
              class="w-full"
            />
          </UFormField>
          <UFormField
            :label="inModifica ? 'Nuova password' : 'Password'"
            name="password"
            :description="
              inModifica
                ? 'Lascia vuoto per non cambiarla. Se la cambi, l\'utente dovrà rifare l\'accesso.'
                : 'Almeno 12 caratteri: comunicala all\'utente, potrà cambiarla dal profilo.'
            "
          >
            <UInput
              v-model="stato.password"
              type="text"
              autocomplete="off"
              autocapitalize="none"
              :spellcheck="false"
              size="xl"
              class="w-full"
            />
          </UFormField>
          <div class="flex gap-2">
            <UButton
              v-if="inModifica"
              icon="i-lucide-trash-2"
              color="error"
              variant="subtle"
              class="flex-1 justify-center"
              :disabled="inCorso"
              @click="elimina"
            >
              Elimina
            </UButton>
            <UButton
              type="submit"
              icon="i-lucide-check"
              class="flex-1 justify-center"
              :loading="inCorso"
              :disabled="nienteDaSalvare"
            >
              {{ inModifica ? "Salva" : "Crea" }}
            </UButton>
          </div>
        </UForm>
      </template>
    </UModal>
  </UContainer>
</template>
