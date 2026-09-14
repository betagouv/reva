import { CertificationAuthorityStructure, Prisma } from "@prisma/client";

import { processPaginationInfo } from "@/modules/shared/list/pagination";
import { prismaClient } from "@/prisma/client";

export const getCertificationAuthorityStructures = async ({
  searchFilter,
  limit = 10,
  offset = 0,
}: {
  searchFilter?: string;
  limit?: number;
  offset?: number;
}): Promise<PaginatedListResult<CertificationAuthorityStructure>> => {
  const whereClause: Prisma.CertificationAuthorityStructureWhereInput = {};
  if (searchFilter) {
    whereClause.OR = [
      { label: { contains: searchFilter, mode: "insensitive" } },
      {
        certificationAuthorityOnCertificationAuthorityStructure: {
          some: {
            certificationAuthority: {
              OR: [
                { label: { contains: searchFilter, mode: "insensitive" } },
                {
                  Account: {
                    some: {
                      email: { contains: searchFilter, mode: "insensitive" },
                    },
                  },
                },
                {
                  certificationAuthorityOnDepartment: {
                    some: {
                      department: {
                        OR: [
                          {
                            label: {
                              contains: searchFilter,
                              mode: "insensitive",
                            },
                          },
                          {
                            code: {
                              contains: searchFilter,
                              mode: "insensitive",
                            },
                          },
                          {
                            region: {
                              label: {
                                contains: searchFilter,
                                mode: "insensitive",
                              },
                            },
                          },
                        ],
                      },
                    },
                  },
                },
                {
                  contactEmail: { contains: searchFilter, mode: "insensitive" },
                },
                {
                  contactFullName: {
                    contains: searchFilter,
                    mode: "insensitive",
                  },
                },
                {
                  certificationAuthorityLocalAccount: {
                    some: {
                      certificationAuthorityLocalAccountOnAccount: {
                        some: {
                          account: {
                            OR: [
                              {
                                firstname: {
                                  contains: searchFilter,
                                  mode: "insensitive",
                                },
                              },
                              {
                                lastname: {
                                  contains: searchFilter,
                                  mode: "insensitive",
                                },
                              },
                              {
                                email: {
                                  contains: searchFilter,
                                  mode: "insensitive",
                                },
                              },
                            ],
                          },
                        },
                      },
                    },
                  },
                },
              ],
            },
          },
        },
      },
      {
        certificationRegistryManager: {
          account: {
            OR: [
              { firstname: { contains: searchFilter, mode: "insensitive" } },
              { lastname: { contains: searchFilter, mode: "insensitive" } },
              { email: { contains: searchFilter, mode: "insensitive" } },
            ],
          },
        },
      },
    ];
  }
  const certificationAuthorityStructure =
    await prismaClient.certificationAuthorityStructure.findMany({
      where: whereClause,
      orderBy: [{ label: "asc" }],
      take: limit,
      skip: offset,
    });

  const count = await prismaClient.certificationAuthorityStructure.count({
    where: whereClause,
  });

  return {
    rows: certificationAuthorityStructure,
    info: processPaginationInfo({
      totalRows: count,
      limit: limit,
      offset,
    }),
  };
};
