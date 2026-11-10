"use server"

import { auth } from "@/lib/auth"
import prisma from "@/lib/prisma"
import { bankAccountListSchema, bankAccountSchema, BankAccountFormValues } from "@/lib/schemas/bank-account"
import { headers } from "next/headers"

export async function GetBankAccounts(input: unknown = {}) {
  try {
    const hasPermission = await auth.api.userHasPermission({
      headers: await headers(),
      body: {
        permissions: {
          bankAccounts: ["read"]
        }
      }
    })

    if (!hasPermission.success) {
      return { error: "Unauthorized", message: "You do not have permission to read settings" }
    }

    const parsed = bankAccountListSchema.safeParse(input);
    if (!parsed.success) {
      return { error: "Invalid filters", message: "Invalid bank account filters" };
    }

    const { page, pageSize, search } = parsed.data;
    const where = search
      ? {
          OR: [
            { accountName: { contains: search, mode: "insensitive" as const } },
            { bankName: { contains: search, mode: "insensitive" as const } },
          ],
        }
      : {};
    const [accounts, totalCount] = await Promise.all([
      prisma.companyBankAccount.findMany({
        where,
        orderBy: [{ displayOrder: "asc" }, { id: "asc" }],
        skip: page * pageSize,
        take: pageSize,
      }),
      prisma.companyBankAccount.count({ where }),
    ]);
    return {
      success: true,
      data: accounts,
      pagination: {
        page,
        pageSize,
        totalCount,
        totalPages: Math.ceil(totalCount / pageSize),
      },
    }
  } catch (error) {
    if (process.env.NODE_ENV === 'development') console.log(error)
    return { error: "Internal Server Error", message: "An error occurred while fetching bank accounts" }
  }
}

export async function CreateBankAccount(data: BankAccountFormValues) {
  try {
    const hasPermission = await auth.api.userHasPermission({
      headers: await headers(),
      body: {
        permissions: {
          bankAccounts: ["create"]
        }
      }
    })

    if (!hasPermission.success) {
      return { error: "Unauthorized", message: "You do not have permission to update settings" }
    }

    const validatedData = bankAccountSchema.safeParse(data)
    if (!validatedData.success) {
      return { error: "Invalid data", message: "Invalid data provided" }
    }

    const company = await prisma.company.findFirst()
    if (!company) {
       return { error: "Bad Request", message: "Company profile must be created first" }
    }

    if (validatedData.data.isDefault) {
      await prisma.companyBankAccount.updateMany({
        where: { companyId: company.id },
        data: { isDefault: false }
      })
    }

    const payload = {
        ...validatedData.data,
        companyId: company.id,
        qrCodeImage: validatedData.data.qrCodeImage ? JSON.parse(JSON.stringify(validatedData.data.qrCodeImage)) : null,
    }

    const account = await prisma.companyBankAccount.create({
      data: payload
    })

    return {
      success: true,
      message: "Bank account created successfully",
      accountId: account.id,
    }
  } catch (error) {
    if (process.env.NODE_ENV === 'development') console.log(error)
    return { error: "Internal Server Error", message: "An error occurred while creating the bank account" }
  }
}

export async function CanCreateBankAccount() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) return false;

  const permission = await auth.api.userHasPermission({
    headers: await headers(),
    body: { permissions: { bankAccounts: ["create"] } },
  });
  return permission.success;
}

export async function UpdateBankAccount(id: string, data: BankAccountFormValues) {
  try {
    const hasPermission = await auth.api.userHasPermission({
      headers: await headers(),
      body: {
        permissions: {
          bankAccounts: ["update"]
        }
      }
    })

    if (!hasPermission.success) {
      return { error: "Unauthorized", message: "You do not have permission to update settings" }
    }

    const validatedData = bankAccountSchema.safeParse(data)
    if (!validatedData.success) {
      return { error: "Invalid data", message: "Invalid data provided" }
    }

    const company = await prisma.company.findFirst()
    if (!company) {
       return { error: "Bad Request", message: "Company profile must be created first" }
    }

    if (validatedData.data.isDefault) {
      await prisma.companyBankAccount.updateMany({
        where: { companyId: company.id, id: { not: id } },
        data: { isDefault: false }
      })
    }
    
    const payload = {
        ...validatedData.data,
        qrCodeImage: validatedData.data.qrCodeImage ? JSON.parse(JSON.stringify(validatedData.data.qrCodeImage)) : null,
    }

    await prisma.companyBankAccount.update({
      where: { id },
      data: payload
    })

    return { success: true, message: "Bank account updated successfully" }
  } catch (error) {
    if (process.env.NODE_ENV === 'development') console.log(error)
    return { error: "Internal Server Error", message: "An error occurred while updating the bank account" }
  }
}

export async function DeleteBankAccount(id: string) {
  try {
    const hasPermission = await auth.api.userHasPermission({
      headers: await headers(),
      body: {
        permissions: {
          bankAccounts: ["delete"]
        }
      }
    })

    if (!hasPermission.success) {
      return { error: "Unauthorized", message: "You do not have permission to update settings" }
    }

    await prisma.$transaction(async (tx) => {
      await tx.financialAccount.updateMany({
        where: { companyBankAccountId: id },
        data: { isActive: false },
      });
      await tx.companyBankAccount.delete({
        where: { id },
      });
    })

    return { success: true, message: "Bank account deleted successfully" }
  } catch (error) {
    if (process.env.NODE_ENV === 'development') console.log(error)
    return { error: "Internal Server Error", message: "An error occurred while deleting the bank account" }
  }
}

export async function SetDefaultBankAccount(id: string) {
  try {
    const hasPermission = await auth.api.userHasPermission({
      headers: await headers(),
      body: {
        permissions: {
          bankAccounts: ["update"]
        }
      }
    })

    if (!hasPermission.success) {
      return { error: "Unauthorized", message: "You do not have permission to update settings" }
    }

    const company = await prisma.company.findFirst()
    if (!company) {
       return { error: "Bad Request", message: "Company profile must be created first" }
    }

    await prisma.$transaction([
      prisma.companyBankAccount.updateMany({
        where: { companyId: company.id },
        data: { isDefault: false }
      }),
      prisma.companyBankAccount.update({
        where: { id },
        data: { isDefault: true }
      })
    ])

    return { success: true, message: "Default bank account updated successfully" }
  } catch (error) {
    if (process.env.NODE_ENV === 'development') console.log(error)
    return { error: "Internal Server Error", message: "An error occurred while setting the default bank account" }
  }
}

export async function ToggleBankAccountStatus(id: string, isActive: boolean) {
  try {
    const hasPermission = await auth.api.userHasPermission({
      headers: await headers(),
      body: {
        permissions: {
          bankAccounts: ["update"]
        }
      }
    })

    if (!hasPermission.success) {
      return { error: "Unauthorized", message: "You do not have permission to update settings" }
    }

    await prisma.companyBankAccount.update({
      where: { id },
      data: { isActive }
    })

    return { success: true, message: "Bank account status updated successfully" }
  } catch (error) {
    if (process.env.NODE_ENV === 'development') console.log(error)
    return { error: "Internal Server Error", message: "An error occurred while updating the bank account status" }
  }
}
