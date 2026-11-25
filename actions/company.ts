"use server"

import {
  checkOrganizationPermission,
  getActiveOrganizationId,
} from "@/lib/organization-authorization";
import prisma from "@/lib/prisma"
import { companySchema, CompanyFormValues } from "@/lib/schemas/company"
import { headers } from "next/headers"

export async function GetCompany() {
  try {
    const organizationId = await getActiveOrganizationId();
    if (!organizationId) {
      return { error: "Unauthorized", message: "You do not have permission to read settings" };
    }

    const hasPermission = await checkOrganizationPermission({
      headers: await headers(),
      body: {
        permissions: {
          company: ["read"]
        }
      }
    })

    if (!hasPermission.success) {
      return { error: "Unauthorized", message: "You do not have permission to read settings" }
    }

    const company = await prisma.company.findUnique({
      where: { organizationId },
    });
    return { success: true, company }
  } catch (error) {
    if (process.env.NODE_ENV === 'development') console.log(error)
    return { error: "Internal Server Error", message: "An error occurred while fetching the company" }
  }
}

export async function UpdateCompany(data: CompanyFormValues) {
  try {
    const organizationId = await getActiveOrganizationId();
    if (!organizationId) {
      return { error: "Unauthorized", message: "You do not have permission to update settings" };
    }

    const hasPermission = await checkOrganizationPermission({
      headers: await headers(),
      body: {
        permissions: {
          company: ["update"]
        }
      }
    })

    if (!hasPermission.success) {
      return { error: "Unauthorized", message: "You do not have permission to update settings" }
    }

    const validatedData = companySchema.safeParse(data)

    if (!validatedData.success) {
      return { error: "Invalid data", message: "Invalid data provided" }
    }

    const existing = await prisma.company.findUnique({
      where: { organizationId },
      select: { id: true },
    });
    
    // Using json conversion for logo fields if they exist
    const payload = {
        ...validatedData.data,
        logo: validatedData.data.logo ? JSON.parse(JSON.stringify(validatedData.data.logo)) : null,
        darkLogo: validatedData.data.darkLogo ? JSON.parse(JSON.stringify(validatedData.data.darkLogo)) : null,
        favicon: validatedData.data.favicon ? JSON.parse(JSON.stringify(validatedData.data.favicon)) : null,
        signatureImage: validatedData.data.signatureImage ? JSON.parse(JSON.stringify(validatedData.data.signatureImage)) : null,
        sealImage: validatedData.data.sealImage ? JSON.parse(JSON.stringify(validatedData.data.sealImage)) : null,
    }

    if (existing) {
      await prisma.company.update({
        where: { id: existing.id },
        data: payload
      })
    } else {
      await prisma.company.create({
        data: { ...payload, organizationId }
      })
    }

    return { success: true, message: "Company profile updated successfully" }
  } catch (error) {
    if (process.env.NODE_ENV === 'development') console.log(error)
    return { error: "Internal Server Error", message: "An error occurred while updating the company" }
  }
}
