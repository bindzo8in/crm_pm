'use server'

import { auth } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { Prisma } from "@/app/generated/prisma/client";
import { CustomerQuerySchema, customerSchema, CustomerSchema } from "@/lib/schemas/customer-schema";
import { headers } from "next/headers";
import { hasBusinessWorkspaceAccess } from "@/lib/workspace-access";

type CustomerAction = "create" | "read" | "update" | "delete";

async function hasCustomerPermission(action: CustomerAction): Promise<boolean> {
  const requestHeaders = await headers();
  const session = await auth.api.getSession({ headers: requestHeaders });
  if (!session?.user || !hasBusinessWorkspaceAccess(session.user)) {
    return false;
  }

  const permission = await auth.api.userHasPermission({
    headers: requestHeaders,
    body: { permissions: { customers: [action] } },
  });
  return permission.success;
}

export async function CreateCustomer(data: CustomerSchema) {
  try {
    if (!(await hasCustomerPermission("create"))) {
      return { error: "Unauthorized", message: "You do not have permission to create a customer" }
    }

    // Validate the input data
    const validatedData = customerSchema.safeParse(data);

    if (!validatedData.success) {
      return { error: "Invalid data", message: "Invalid data provided" }
    }
    const { documents, ...customerData } = validatedData.data;
    const customer = await prisma.customer.create({
      data: {
        ...customerData,
        documents: documents as Prisma.InputJsonValue,
      },
    })

    return {
      success: true,
      message: "Customer created successfully",
      customer: {
        id: customer.id,
        customerNumber: customer.customerNumber,
        displayName: customer.displayName,
        companyName: customer.companyName,
        primaryContactName: customer.primaryContactName,
      },
    }
  } catch (error) {
    if (process.env.NODE_ENV === 'development') console.log(error)
    return { error: "Internal Server Error", message: "An error occurred while creating the customer" }
  }
}

export async function UpdateCustomer(data: CustomerSchema) {
  try {
    if (!(await hasCustomerPermission("update"))) {
      return { error: "Unauthorized", message: "You do not have permission to update a customer" }
    }

    // Validate the input data
    const validatedData = customerSchema.safeParse(data);

    if (!validatedData.success) {
      return { error: "Invalid data", message: "Invalid data provided" }
    }
    const { documents, ...customerData } = validatedData.data;
    await prisma.customer.update({
      where: {
        id: validatedData.data.id
      },
      data: {
        ...customerData,
        documents: documents as Prisma.InputJsonValue,
      },
    })

    return { success: true, message: "Customer updated successfully" }
  } catch (error) {
    if (process.env.NODE_ENV === 'development') console.log(error)
    return { error: "Internal Server Error", message: "An error occurred while updating the customer" }
  }
}

export async function GetCustomer(id: string) {
  try {
    if (!(await hasCustomerPermission("read"))) {
      return { error: "Unauthorized", message: "You do not have permission to view this customer" };
    }

    const customer = await prisma.customer.findUnique({
      where: {
        id
      }
    })

    return { success: true, customer }
  } catch (error) {
    if (process.env.NODE_ENV === 'development') console.log(error)
    return { error: "Internal Server Error", message: "An error occurred while fetching the customer" }
  }
}

export async function GetCustomers(
  query: CustomerQuerySchema
) {
  try {
    if (!(await hasCustomerPermission("read"))) {
      throw new Error("You do not have permission to view customers");
    }

    const {
      page,
      pageSize,
      search,
      sortDirection,
    } = query;

    const where = {
      deletedAt: null,

      ...(search && {
        OR: [
          {
            displayName: {
              contains: search,
              mode: "insensitive" as const,
            },
          },
          {
            companyName: {
              contains: search,
              mode: "insensitive" as const,
            },
          },
          {
            primaryContactEmail: {
              contains: search,
              mode: "insensitive" as const,
            },
          },
          {
            primaryContactPhone: {
              contains: search,
              mode: "insensitive" as const,
            },
          },
        ],
      }),
    };

    const [customers, total] = await prisma.$transaction([
      prisma.customer.findMany({
        skip: page * pageSize,
        take: pageSize,

        select: {
          id: true,
          customerNumber: true,
          displayName: true,
          companyName: true,
          primaryContactName: true,
          primaryContactEmail: true,
          primaryContactPhone: true,
          customerType: true,
          createdAt: true,
        },

        where,

        orderBy: [
          {
            createdAt: sortDirection,
          },
          {
            id: "desc",
          },
        ],
      }),

      prisma.customer.count({
        where,
      }),
    ]);

    return {
      success: true,
      data: customers,

      pagination: {
        page,
        pageSize,
        total,
        pageCount: Math.ceil(total / pageSize),
      },
    };
  } catch (error) {
    if (process.env.NODE_ENV === "development") {
      console.error(error);
    }

    throw error;
  }
}

export async function DeleteCustomer(id: string) {
  try {
    if (!(await hasCustomerPermission("delete"))) {
      return { error: "Unauthorized", message: "You do not have permission to delete a customer" }
    }

    await prisma.customer.update({
      where: {
        id
      },
      data: {
        deletedAt: new Date()
      }
    })

    return { success: true, message: "Customer deleted successfully" }
  } catch (error) {
    if (process.env.NODE_ENV === 'development') console.log(error)
    return { error: "Internal Server Error", message: "An error occurred while deleting the customer" }
  }
}

export async function GetCustomerOptions(search?: string) {
  try {
    if (!(await hasCustomerPermission("read"))) {
      throw new Error("You do not have permission to view customers");
    }

    const customers = await prisma.customer.findMany({
      where: {
        deletedAt: null,

        ...(search
          ? {
            OR: [
              {
                displayName: {
                  contains: search,
                  mode: "insensitive",
                },
              },
              {
                companyName: {
                  contains: search,
                  mode: "insensitive",
                },
              },
              {
                primaryContactName: {
                  contains: search,
                  mode: "insensitive",
                },
              },
              {
                primaryContactEmail: {
                  contains: search,
                  mode: "insensitive",
                },
              },
              {
                primaryContactPhone: {
                  contains: search,
                  mode: "insensitive",
                },
              },
            ],
          }
          : {}),
      },

      select: {
        id: true,
        customerNumber: true,
        displayName: true,
        companyName: true,
        primaryContactName: true,
      },

      orderBy: [
        {
          displayName: "asc",
        },
        {
          customerNumber: "asc",
        },
      ],

      take: 20,
    });

    return {
      success: true,
      data: customers,
    };
  } catch (error) {
    if (process.env.NODE_ENV === "development") {
      console.error(error);
    }

    throw error;
  }
}