import { IFieldResolver, MercuriusContext } from "mercurius";

import { NOT_AUTHORIZED_ORGANISM_ACCESS } from "@/modules/shared/security/messages";

// Signature commune aux features de contrôle d'accès à un organisme.
type OrganismAccessCheck = (params: {
  userRoles: KeyCloakUserRole[];
  userKeycloakId: string;
  organismId: string;
}) => Promise<boolean>;

// Fabrique un middleware clé sur UN SEUL argument, sans repli : les middlewares organisme
// historiques essaient plusieurs clés (`organismId`, `data.organismId`, `root.id`...) et leur
// ajouter une clé changerait le comportement de tous leurs autres consommateurs.
const organismFromArg =
  (getOrganismId: (args: Record<string, any>) => string) =>
  (isAllowed: OrganismAccessCheck) =>
  (next: IFieldResolver<unknown>) =>
  async (
    root: any,
    args: Record<string, any>,
    context: MercuriusContext,
    info: any,
  ) => {
    if (
      !(await isAllowed({
        userRoles: context.auth.userInfo.realm_access?.roles || [],
        organismId: getOrganismId(args),
        userKeycloakId: context.auth.userInfo.sub,
      }))
    ) {
      throw new Error(NOT_AUTHORIZED_ORGANISM_ACCESS);
    }
    return next(root, args, context, info);
  };

// Pour `organism_getOrganism(id:)`.
export const organismByIdArg = organismFromArg((args) => args.id);

// Pour les mutations recevant `data: { organismId }`.
export const organismByDataOrganismIdArg = organismFromArg(
  (args) => args.data?.organismId,
);
