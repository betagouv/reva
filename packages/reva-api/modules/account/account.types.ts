export type Role = "admin" | "manage_candidacy" | "gestion_maison_mere_aap";

export interface Account {
  id: string;
  keycloakId: string;
  email: string;
  firstname: string | null;
  lastname: string | null;
  disabledAt: Date | null;
}
