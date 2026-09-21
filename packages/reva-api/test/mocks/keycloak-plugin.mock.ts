import { FastifyPluginAsync, FastifyRequest } from "fastify";
import fp from "fastify-plugin";

interface KeycloakConnectUserInfo {
  realm_access?: {
    roles: KeyCloakUserRole[];
  };
  sub: string;
  email: string;
}

const keycloakPluginMock: FastifyPluginAsync = async (
  app,
  _opts,
): Promise<void> => {
  app.addHook("onRequest", async (req: FastifyRequest, _res: any) => {
    if (req.headers.authorization) {
      const [role, sub] = req.headers.authorization.split("/");
      const email = "no-reply@vae.gouv.fr";
      let userInfo: KeycloakConnectUserInfo;
      switch (role as KeyCloakUserRole) {
        case "admin":
          userInfo = {
            sub,
            email,
            realm_access: {
              roles: ["admin", "manage_candidacy"],
            },
          };
          break;
        case "manage_candidacy":
          userInfo = {
            sub,
            email,
            realm_access: {
              roles: ["manage_candidacy"],
            },
          };
          break;
        case "manage_feasibility":
          userInfo = {
            sub,
            email,
            realm_access: {
              roles: ["manage_feasibility"],
            },
          };
          break;
        case "candidate":
          userInfo = {
            sub,
            email,
            realm_access: {
              roles: ["candidate"],
            },
          };
          break;
        case "gestion_maison_mere_aap":
          userInfo = {
            sub,
            email,
            realm_access: {
              roles: ["manage_candidacy", "gestion_maison_mere_aap"],
            },
          };
          break;
        case "manage_certification_authority_local_account":
          userInfo = {
            sub,
            email,
            realm_access: {
              roles: [
                "manage_feasibility",
                "manage_certification_authority_local_account",
              ],
            },
          };
          break;
        case "manage_certification_registry":
          userInfo = {
            sub,
            email,
            realm_access: {
              roles: ["manage_certification_registry"],
            },
          };
          break;
        case "manage_vae_collective":
          userInfo = {
            sub,
            email,
            realm_access: {
              roles: ["manage_vae_collective"],
            },
          };
          break;
        case "sous_compte_vae_collective":
          userInfo = {
            sub,
            email,
            realm_access: {
              roles: ["sous_compte_vae_collective"],
            },
          };
          break;
      }
      req.auth = {
        hasRole: (role: KeyCloakUserRole) => {
          return (userInfo?.realm_access?.roles as KeyCloakUserRole[]).includes(
            role,
          );
        },
        token: req.headers.authorization,
        userInfo,
      };
    }
    req.auth = req.auth || { hasRole: () => false };
  });
};

export default fp(keycloakPluginMock);
