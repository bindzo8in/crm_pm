"use server"

import { auth } from "@/lib/auth"
import prisma from "@/lib/prisma"
import { bankAccountSchema, BankAccountFormValues } from "@/lib/schemas/bank-account"
import { headers } from "next/headers"

export async function GetBankAccounts() {
  try {
    const hasPermission = await auth.api.userHasPermission({
      headers: await headers(),
      body: {
        permissions: {
          settings: ["read"]
        }
      }
    })

    if (!hasPermission.success) {
      return { error: "Unauthorized", message: "You do not have permission to read settings" }
    }

    const accounts = await prisma.companyBankAccount.findMany({
      orderBy: { displayOrder: "asc" }
    })
    return { success: true, data: accounts }
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
          settings: ["update"]
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

    let company = await prisma.company.findFirst()
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

    await prisma.companyBankAccount.create({
      data: payload
    })

    return { success: true, message: "Bank account created successfully" }
  } catch (error) {
    if (process.env.NODE_ENV === 'development') console.log(error)
    return { error: "Internal Server Error", message: "An error occurred while creating the bank account" }
  }
}

export async function UpdateBankAccount(id: string, data: BankAccountFormValues) {
  try {
    const hasPermission = await auth.api.userHasPermission({
      headers: await headers(),
      body: {
        permissions: {
          settings: ["update"]
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

    let company = await prisma.company.findFirst()
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
          settings: ["update"]
        }
      }
    })

    if (!hasPermission.success) {
      return { error: "Unauthorized", message: "You do not have permission to update settings" }
    }

    await prisma.companyBankAccount.delete({
      where: { id }
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
          settings: ["update"]
        }
      }
    })

    if (!hasPermission.success) {
      return { error: "Unauthorized", message: "You do not have permission to update settings" }
    }

    let company = await prisma.company.findFirst()
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
          settings: ["update"]
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
