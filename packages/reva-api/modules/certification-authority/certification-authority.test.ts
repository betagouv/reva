import { Account } from "@prisma/client";

import { graphql } from "@/modules/graphql/generated";
import { UpdateCertificationAuthorityInput } from "@/modules/graphql/generated/graphql";
import * as getKeycloakAdminModule from "@/modules/shared/auth/getKeycloakAdmin";
import { NOT_AUTHORIZED } from "@/modules/shared/security/messages";
import { prismaClient } from "@/prisma/client";
import { authorizationHeaderForUser } from "@/test/helpers/authorization-helper";
import { createCertificationAuthorityHelper } from "@/test/helpers/entities/create-certification-authority-helper";
import { createCertificationAuthorityLocalAccountHelper } from "@/test/helpers/entities/create-certification-authority-local-account-helper";
import { createCertificationAuthorityStructureHelper } from "@/test/helpers/entities/create-certification-authority-structure-helper";
import { createCertificationHelper } from "@/test/helpers/entities/create-certification-helper";
import { createParcoursCertificationHelper } from "@/test/helpers/entities/create-parcours-certification-helper";
import { injectGraphql } from "@/test/helpers/graphql-helper";
import { getGraphQLClient } from "@/test/test-graphql-client";

import * as createAccount from "../account/features/createAccount";

import { getCertificationAuthorityLocalAccountByCertificationAuthorityId } from "./features/getCertificationAuthorityLocalAccountByCertificationAuthorityId";

async function graphqlUpdateCertificationAuthority({
  role,
  account,
  certificationAuthorityId,
  data,
}: {
  role: KeyCloakUserRole;
  account: { keycloakId: string };
  certificationAuthorityId: string;
  data: UpdateCertificationAuthorityInput;
}) {
  const graphqlClient = getGraphQLClient({
    headers: {
      authorization: authorizationHeaderForUser({
        role,
        keycloakId: account.keycloakId,
      }),
    },
  });

  const updateCertificationAuthorityById = graphql(`
    mutation updateCertificationAuthority(
      $certificationAuthorityId: ID!
      $certificationAuthorityData: UpdateCertificationAuthorityInput!
    ) {
      certification_authority_updateCertificationAuthority(
        certificationAuthorityId: $certificationAuthorityId
        certificationAuthorityData: $certificationAuthorityData
      ) {
        id
        label
        contactFullName
        contactEmail
        account {
          email
          firstname
          lastname
        }
      }
    }
  `);

  return graphqlClient.request(updateCertificationAuthorityById, {
    certificationAuthorityId,
    certificationAuthorityData: data,
  });
}

async function graphqlGetParcoursForCertificationAndCertificationAuthority({
  certificationId,
  certificationAuthorityId,
  role,
  account,
}: {
  certificationId: string;
  certificationAuthorityId: string;
  role: KeyCloakUserRole;
  account: { keycloakId: string };
}) {
  const graphqlClient = getGraphQLClient({
    headers: {
      authorization: authorizationHeaderForUser({
        role,
        keycloakId: account.keycloakId,
      }),
    },
  });
  const getParcoursForCertificationAndCertificationAuthority = graphql(`
    query getParcoursForCertificationAndCertificationAuthority(
      $certificationId: ID!
      $certificationAuthorityId: ID!
    ) {
      certification_authority_getParcoursForCertificationAndCertificationAuthority(
        certificationId: $certificationId
        certificationAuthorityId: $certificationAuthorityId
      ) {
        id
        label
      }
    }
  `);
  return graphqlClient.request(
    getParcoursForCertificationAndCertificationAuthority,
    {
      certificationId,
      certificationAuthorityId,
    },
  );
}

async function graphqlGetCertificationsAndParcoursByCertificationAuthorityId({
  certificationAuthorityId,
  certificationAuthorityLocalAccountIdFilter,
  role,
  account,
}: {
  certificationAuthorityId: string;
  certificationAuthorityLocalAccountIdFilter?: string;
  role: KeyCloakUserRole;
  account: { keycloakId: string };
}) {
  const graphqlClient = getGraphQLClient({
    headers: {
      authorization: authorizationHeaderForUser({
        role,
        keycloakId: account.keycloakId,
      }),
    },
  });
  const getParcoursForCertificationAndCertificationAuthority = graphql(`
    query certification_authority_getCertificationAuthority(
      $certificationAuthorityId: ID!
      $certificationAuthorityLocalAccountIdFilter: ID
    ) {
      certification_authority_getCertificationAuthority(
        id: $certificationAuthorityId
      ) {
        certificationsAndParcours(
          certificationAuthorityLocalAccountIdFilter: $certificationAuthorityLocalAccountIdFilter
        ) {
          rows {
            certification {
              id
              label
            }
            parcours {
              id
              label
            }
          }
        }
      }
    }
  `);
  return graphqlClient.request(
    getParcoursForCertificationAndCertificationAuthority,
    {
      certificationAuthorityId,
      certificationAuthorityLocalAccountIdFilter,
    },
  );
}

async function graphqlUpdateParcoursForCertificationAndCertificationAuthority({
  role,
  account,
  certificationId,
  certificationAuthorityId,
  parcoursCertificationIds,
}: {
  role: KeyCloakUserRole;
  account: { keycloakId: string };
  certificationId: string;
  certificationAuthorityId: string;
  parcoursCertificationIds: string[];
}) {
  const graphqlClient = getGraphQLClient({
    headers: {
      authorization: authorizationHeaderForUser({
        role,
        keycloakId: account.keycloakId,
      }),
    },
  });
  const updateParcoursForCertificationAndCertificationAuthority = graphql(`
    mutation updateParcoursForCertificationAndCertificationAuthority(
      $certificationId: ID!
      $certificationAuthorityId: ID!
      $parcoursCertificationIds: [ID!]!
    ) {
      certification_authority_updateParcoursForCertificationAndCertificationAuthority(
        certificationId: $certificationId
        certificationAuthorityId: $certificationAuthorityId
        parcoursCertificationIds: $parcoursCertificationIds
      )
    }
  `);
  return graphqlClient.request(
    updateParcoursForCertificationAndCertificationAuthority,
    {
      certificationId,
      certificationAuthorityId,
      parcoursCertificationIds,
    },
  );
}
test("should update a certification authority's contact info and leave the account info as is as a certificaton authority manager", async () => {
  const certificationAuthority = await createCertificationAuthorityHelper();

  const resp = await graphqlUpdateCertificationAuthority({
    role: "manage_certification_authority_local_account",
    account: certificationAuthority.Account[0],
    certificationAuthorityId: certificationAuthority.id,
    data: {
      label: certificationAuthority.label,
      accountEmail: "new email",
      accountFirstname: "new firstname",
      accountLastname: "new lastname",
      contactFullName: "new name",
      contactEmail: "new email",
    },
  });

  expect(resp.certification_authority_updateCertificationAuthority).toEqual({
    id: certificationAuthority.id,
    label: certificationAuthority.label,
    contactFullName: "new name",
    contactEmail: "new email",
    account: {
      email: certificationAuthority.Account[0].email,
      firstname: certificationAuthority.Account[0].firstname,
      lastname: certificationAuthority.Account[0].lastname,
    },
  });
});

test("should update a certification authority's contact and account info as an admin", async () => {
  vi.spyOn(getKeycloakAdminModule, "getKeycloakAdmin").mockImplementation(() =>
    Promise.resolve({
      users: {
        findOne: () => Promise.resolve({}),
        listGroups: () => Promise.resolve([]),
        update: () => Promise.resolve({}),
      },
    }),
  );

  const certificationAuthority = await createCertificationAuthorityHelper();

  const resp = await graphqlUpdateCertificationAuthority({
    role: "admin",
    account: {
      keycloakId: "3c6d4571-da18-49a3-90e5-cc83ae7446bf",
    },
    certificationAuthorityId: certificationAuthority.id,
    data: {
      label: "new label",
      accountEmail: "new account email",
      accountFirstname: "new account firstname",
      accountLastname: "new account lastname",
      contactFullName: "new name",
      contactEmail: "new email",
    },
  });

  expect(resp.certification_authority_updateCertificationAuthority).toEqual({
    id: certificationAuthority.id,
    label: "new label",
    contactFullName: "new name",
    contactEmail: "new email",
    account: {
      email: "new account email",
      firstname: "new account firstname",
      lastname: "new account lastname",
    },
  });
});

test("should refuse to to update a certification authority's contact info as a candidacy manager", async () => {
  const certificationAuthority = await createCertificationAuthorityHelper();

  await expect(
    graphqlUpdateCertificationAuthority({
      role: "manage_candidacy",
      account: {
        keycloakId: "64ae851c-9519-4efb-a483-db4b71918e2d",
      },
      certificationAuthorityId: certificationAuthority.id,
      data: {
        label: certificationAuthority.label,
        accountEmail: "new email",
        accountFirstname: "new firstname",
        accountLastname: "new lastname",
        contactFullName: "new name",
        contactEmail: "new email",
      },
    }),
  ).rejects.toThrowError(NOT_AUTHORIZED);
});

test("should refuse to to update a certification authority's contact info as a candidate", async () => {
  const certificationAuthority = await createCertificationAuthorityHelper();

  await expect(
    graphqlUpdateCertificationAuthority({
      role: "candidate",
      account: {
        keycloakId: "64ae851c-9519-4efb-a483-db4b71918e2d",
      },
      certificationAuthorityId: certificationAuthority.id,
      data: {
        label: "new label",
        accountEmail: "new account email",
        accountFirstname: "new account firstname",
        accountLastname: "new account lastname",
        contactFullName: "new name",
        contactEmail: "new email",
      },
    }),
  ).rejects.toThrowError(NOT_AUTHORIZED);
});

test("should update all of a certification authority's local accounts contact info when isGlobalContact is true", async () => {
  vi.spyOn(getKeycloakAdminModule, "getKeycloakAdmin").mockImplementation(() =>
    Promise.resolve({
      users: {
        findOne: () => Promise.resolve({}),
        listGroups: () => Promise.resolve([]),
        update: () => Promise.resolve({}),
      },
    }),
  );

  const certificationAuthority = await createCertificationAuthorityHelper();

  await createCertificationAuthorityLocalAccountHelper({
    certificationAuthorityId: certificationAuthority.id,
  });

  await createCertificationAuthorityLocalAccountHelper({
    certificationAuthorityId: certificationAuthority.id,
  });

  const resp = await graphqlUpdateCertificationAuthority({
    role: "admin",
    account: {
      keycloakId: "3c6d4571-da18-49a3-90e5-cc83ae7446bf",
    },
    certificationAuthorityId: certificationAuthority.id,
    data: {
      label: "new label",
      accountEmail: "new account email",
      accountFirstname: "new account firstname",
      accountLastname: "new account lastname",
      contactFullName: "new name",
      contactEmail: "new email",
      isGlobalContact: true,
    },
  });

  expect(resp.certification_authority_updateCertificationAuthority).toEqual({
    id: certificationAuthority.id,
    label: "new label",
    contactFullName: "new name",
    contactEmail: "new email",
    account: {
      email: "new account email",
      firstname: "new account firstname",
      lastname: "new account lastname",
    },
  });

  const localAccounts =
    await getCertificationAuthorityLocalAccountByCertificationAuthorityId({
      certificationAuthorityId: certificationAuthority.id,
    });

  expect(localAccounts?.length).toEqual(2);

  for (const localAccount of localAccounts!) {
    expect(localAccount.contactFullName).toEqual("new name");
    expect(localAccount.contactEmail).toEqual("new email");
  }
});

test("should return an exisiting certification local account list of 1 item for the certification authority", async () => {
  const certificationAuthorityLocalAccount =
    await createCertificationAuthorityLocalAccountHelper();

  const resp = await injectGraphql({
    fastify: global.testApp,
    authorization: authorizationHeaderForUser({
      role: "manage_certification_authority_local_account",
      keycloakId:
        certificationAuthorityLocalAccount.certificationAuthority.Account[0]
          .keycloakId,
    }),
    payload: {
      requestType: "query",
      endpoint: "account_getAccountForConnectedUser",
      returnFields:
        "{certificationAuthority{certificationAuthorityLocalAccounts{id}}}",
    },
  });
  expect(resp.statusCode).toEqual(200);
  const obj = resp.json();
  expect(
    obj.data.account_getAccountForConnectedUser.certificationAuthority
      .certificationAuthorityLocalAccounts,
  ).toMatchObject([{ id: certificationAuthorityLocalAccount.id }]);
});

test("should expose hasReducedRequirements as false by default on certification authority structure", async () => {
  const certificationAuthorityStructure =
    await createCertificationAuthorityStructureHelper();

  const resp = await injectGraphql({
    fastify: global.testApp,
    authorization: authorizationHeaderForUser({
      role: "admin",
      keycloakId: "3c6d4571-da18-49a3-90e5-cc83ae7446bf",
    }),
    payload: {
      requestType: "query",
      endpoint: "certification_authority_getCertificationAuthorityStructure",
      arguments: {
        id: certificationAuthorityStructure.id,
      },
      returnFields: "{id hasReducedRequirements}",
    },
  });

  expect(resp.statusCode).toEqual(200);
  expect(resp.json()).not.toHaveProperty("errors");
  expect(
    resp.json().data.certification_authority_getCertificationAuthorityStructure,
  ).toEqual({
    id: certificationAuthorityStructure.id,
    hasReducedRequirements: false,
  });
});

test("should create a certification authority", async () => {
  vi.spyOn(createAccount, "createAccount").mockImplementation(() =>
    Promise.resolve({} as Account),
  );

  const certificationAuthorityStructure =
    await createCertificationAuthorityStructureHelper();

  const resp = await injectGraphql({
    fastify: global.testApp,
    authorization: authorizationHeaderForUser({
      role: "admin",
      keycloakId: "3c6d4571-da18-49a3-90e5-cc83ae7446bf",
    }),
    payload: {
      requestType: "mutation",
      endpoint: "certification_authority_createCertificationAuthority",
      arguments: {
        input: {
          label: "Mon autorite de certification",
          certificationAuthorityStructureId: certificationAuthorityStructure.id,
          accountEmail: "testaccount.test@gmail.com",
          accountFirstname: "testFirstname",
          accountLastname: "testLastname",
          certificationIds: [],
        },
      },
      returnFields: "{id}",
    },
  });
  expect(resp.statusCode).toEqual(200);
  const obj = resp.json();
  expect(resp.json()).not.toHaveProperty("errors");
  expect(
    obj.data.certification_authority_createCertificationAuthority.id,
  ).not.toBeNull();
});

test("should rollback the certification authority when account creation fails", async () => {
  vi.spyOn(createAccount, "createAccount").mockImplementation(() =>
    Promise.resolve(null as unknown as Account),
  );

  const certificationAuthorityStructure =
    await createCertificationAuthorityStructureHelper();

  const label = "Autorite de certification a rollback";

  const resp = await injectGraphql({
    fastify: global.testApp,
    authorization: authorizationHeaderForUser({
      role: "admin",
      keycloakId: "3c6d4571-da18-49a3-90e5-cc83ae7446bf",
    }),
    payload: {
      requestType: "mutation",
      endpoint: "certification_authority_createCertificationAuthority",
      arguments: {
        input: {
          label,
          certificationAuthorityStructureId: certificationAuthorityStructure.id,
          accountEmail: "rollback.test@gmail.com",
          accountFirstname: "testFirstname",
          accountLastname: "testLastname",
          certificationIds: [],
        },
      },
      returnFields: "{id}",
    },
  });

  expect(resp.statusCode).toEqual(200);
  const obj = resp.json();
  expect(obj.errors[0].message).toBe(
    "Erreur pendant la création du compte certificateur",
  );
  expect(obj.data).toBeNull();

  const certificationAuthority =
    await prismaClient.certificationAuthority.findFirst({
      where: { label },
    });
  expect(certificationAuthority).toBeNull();

  const structureLink =
    await prismaClient.certificationAuthorityOnCertificationAuthorityStructure.findFirst(
      {
        where: {
          certificationAuthorityStructureId: certificationAuthorityStructure.id,
        },
      },
    );
  expect(structureLink).toBeNull();
});

describe("certification authority certification parcours", () => {
  describe("getParcoursForCertificationAndCertificationAuthority", () => {
    test("should return the parcours certifications for a certification and certification authority", async () => {
      const certification = await createCertificationHelper();
      const parcoursCertification = await createParcoursCertificationHelper({
        certificationId: certification.id,
      });
      const certificationAuthority = await createCertificationAuthorityHelper({
        certificationAuthorityOnCertification: {
          create: {
            certificationId: certification.id,
            certificationAuthorityOnCertificationOnParcoursCertifications: {
              create: {
                parcoursCertificationId: parcoursCertification.id,
              },
            },
          },
        },
      });
      const resp =
        await graphqlGetParcoursForCertificationAndCertificationAuthority({
          certificationId: certification.id,
          certificationAuthorityId: certificationAuthority.id,
          role: "manage_certification_authority_local_account",
          account: {
            keycloakId: certificationAuthority.Account[0].keycloakId,
          },
        });
      expect(
        resp.certification_authority_getParcoursForCertificationAndCertificationAuthority,
      ).toEqual([
        { id: parcoursCertification.id, label: parcoursCertification.label },
      ]);
    });

    test("should return an empty array of parcours certifications for a certification and certification authority", async () => {
      const certification = await createCertificationHelper();
      const certificationAuthority = await createCertificationAuthorityHelper({
        certificationAuthorityOnCertification: {
          create: {
            certificationId: certification.id,
          },
        },
      });
      const resp =
        await graphqlGetParcoursForCertificationAndCertificationAuthority({
          certificationId: certification.id,
          certificationAuthorityId: certificationAuthority.id,
          role: "manage_certification_authority_local_account",
          account: {
            keycloakId: certificationAuthority.Account[0].keycloakId,
          },
        });
      expect(
        resp.certification_authority_getParcoursForCertificationAndCertificationAuthority,
      ).toEqual([]);
    });
  });

  describe("certificationAuthority -> certificationsAndParcours resolver", () => {
    test("should return the certification and selected parcours for a certification authority with a certification selected", async () => {
      const certification = await createCertificationHelper();
      const parcoursCertification = await createParcoursCertificationHelper({
        certificationId: certification.id,
      });
      const certificationAuthority = await createCertificationAuthorityHelper({
        certificationAuthorityOnCertification: {
          create: {
            certificationId: certification.id,
            certificationAuthorityOnCertificationOnParcoursCertifications: {
              create: {
                parcoursCertificationId: parcoursCertification.id,
              },
            },
          },
        },
      });
      const resp =
        await graphqlGetCertificationsAndParcoursByCertificationAuthorityId({
          certificationAuthorityId: certificationAuthority.id,
          role: "admin",
          account: {
            keycloakId: certificationAuthority.Account[0].keycloakId,
          },
        });
      expect(
        resp.certification_authority_getCertificationAuthority
          ?.certificationsAndParcours.rows,
      ).toEqual([
        {
          certification: { id: certification.id, label: certification.label },
          parcours: [
            {
              id: parcoursCertification.id,
              label: parcoursCertification.label,
            },
          ],
        },
      ]);
    });

    test("should return the certification and an empty array of parcours for a certification authority with a certification selected but no parcours selected", async () => {
      const certification = await createCertificationHelper();
      await createParcoursCertificationHelper({
        certificationId: certification.id,
      });
      const certificationAuthority = await createCertificationAuthorityHelper({
        certificationAuthorityOnCertification: {
          create: {
            certificationId: certification.id,
          },
        },
      });
      const resp =
        await graphqlGetCertificationsAndParcoursByCertificationAuthorityId({
          certificationAuthorityId: certificationAuthority.id,
          role: "admin",
          account: {
            keycloakId: certificationAuthority.Account[0].keycloakId,
          },
        });
      expect(
        resp.certification_authority_getCertificationAuthority
          ?.certificationsAndParcours.rows,
      ).toEqual([
        {
          certification: { id: certification.id, label: certification.label },
          parcours: [],
        },
      ]);
    });

    test("should return an empty array of certification and parcours for a certification authority with no certification selected", async () => {
      const certificationAuthority = await createCertificationAuthorityHelper();
      const resp =
        await graphqlGetCertificationsAndParcoursByCertificationAuthorityId({
          certificationAuthorityId: certificationAuthority.id,
          role: "admin",
          account: {
            keycloakId: certificationAuthority.Account[0].keycloakId,
          },
        });
      expect(
        resp.certification_authority_getCertificationAuthority
          ?.certificationsAndParcours.rows,
      ).toEqual([]);
    });

    test("should return the certification for a certification authority with a certification selected and also associated to a certification authority local account", async () => {
      const certificationAssociatedToCertificationAuthorityLocalAccount =
        await createCertificationHelper();
      const certificationNotAssociatedToCertificationAuthorityLocalAccount =
        await createCertificationHelper();

      const certificationAuthority = await createCertificationAuthorityHelper({
        certificationAuthorityOnCertification: {
          createMany: {
            data: [
              {
                certificationId:
                  certificationAssociatedToCertificationAuthorityLocalAccount.id,
              },
              {
                certificationId:
                  certificationNotAssociatedToCertificationAuthorityLocalAccount.id,
              },
            ],
          },
        },
      });

      const certificationAuthorityLocalAccount =
        await createCertificationAuthorityLocalAccountHelper({
          certificationAuthorityId: certificationAuthority.id,
          certificationAuthorityLocalAccountOnCertification: {
            create: {
              certificationId:
                certificationAssociatedToCertificationAuthorityLocalAccount.id,
            },
          },
        });

      const resp =
        await graphqlGetCertificationsAndParcoursByCertificationAuthorityId({
          certificationAuthorityId: certificationAuthority.id,
          role: "admin",
          account: {
            keycloakId: certificationAuthority.Account[0].keycloakId,
          },
          certificationAuthorityLocalAccountIdFilter:
            certificationAuthorityLocalAccount.id,
        });
      expect(
        resp.certification_authority_getCertificationAuthority
          ?.certificationsAndParcours.rows,
      ).toEqual([
        {
          certification: {
            id: certificationAssociatedToCertificationAuthorityLocalAccount.id,
            label:
              certificationAssociatedToCertificationAuthorityLocalAccount.label,
          },
          parcours: [],
        },
      ]);
    });
  });

  describe("updateParcoursForCertificationAndCertificationAuthority", () => {
    test("should update the parcours certifications for a certification and certification authority", async () => {
      const certification = await createCertificationHelper();
      const parcoursCertification = await createParcoursCertificationHelper({
        certificationId: certification.id,
      });
      const certificationAuthority = await createCertificationAuthorityHelper({
        certificationAuthorityOnCertification: {
          create: {
            certificationId: certification.id,
            certificationAuthorityOnCertificationOnParcoursCertifications: {
              create: {
                parcoursCertificationId: parcoursCertification.id,
              },
            },
          },
        },
      });

      const newParcoursCertification = await createParcoursCertificationHelper({
        certificationId: certification.id,
      });
      const resp =
        await graphqlUpdateParcoursForCertificationAndCertificationAuthority({
          role: "manage_certification_authority_local_account",
          account: {
            keycloakId: certificationAuthority.Account[0].keycloakId,
          },
          certificationId: certification.id,
          certificationAuthorityId: certificationAuthority.id,
          parcoursCertificationIds: [newParcoursCertification.id],
        });

      expect(
        resp.certification_authority_updateParcoursForCertificationAndCertificationAuthority,
      ).toEqual(true);

      const certificationAuthorityOnCertification =
        await prismaClient.certificationAuthorityOnCertification.findUnique({
          where: {
            certificationAuthorityId_certificationId: {
              certificationAuthorityId: certificationAuthority.id,
              certificationId: certification.id,
            },
          },
          include: {
            certificationAuthorityOnCertificationOnParcoursCertifications: {
              include: { parcoursCertification: true },
            },
          },
        });
      const receivedParcoursIds =
        certificationAuthorityOnCertification?.certificationAuthorityOnCertificationOnParcoursCertifications.map(
          (cacopc) => cacopc.parcoursCertificationId,
        );
      expect(receivedParcoursIds).toEqual([newParcoursCertification.id]);
    });
  });
});
