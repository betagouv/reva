import { isUserGestionnaireMaisonMereAAPOfOrganism } from "../features/isUserGestionnaireMaisonMereAAPOfOrganism";

import { organismByDataOrganismIdArg } from "./organismByIdArg.security";

export const isGestionnaireOfMaisonMereAAPOfOrganismByDataArg =
  organismByDataOrganismIdArg(isUserGestionnaireMaisonMereAAPOfOrganism);
