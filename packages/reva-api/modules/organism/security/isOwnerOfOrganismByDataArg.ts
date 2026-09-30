import { isUserOwnerOfOrganism } from "../features/isUserOwnerOfOrganism";

import { organismByDataOrganismIdArg } from "./organismByIdArg.security";

export const isOwnerOfOrganismByDataArg = organismByDataOrganismIdArg(
  isUserOwnerOfOrganism,
);
