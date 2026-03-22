import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { employeeSchema } from "@/lib/validations";
import { z } from "zod";

export const revalidate = 0;

export async function GET(req: NextRequest) {
  try {
    const employees = await prisma.employee.findMany({
      include: {
        user: true,
      },
      orderBy: { employeeId: 'asc' }
    });

    return NextResponse.json({ success: true, data: employees });
  } catch (error: any) {
    console.error("GET Employees Error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

import { hash } from "bcryptjs";
import { UserRole } from "@prisma/client";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    console.log("POST Employee Body:", body);
    const validated = employeeSchema.parse(body);
    console.log("POST Employee Validated:", validated);

    // Auto-generate employee ID (TT-EMP-XXXX)
    const count = await prisma.employee.count();
    const employeeId = `TT-EMP-${(count + 1).toString().padStart(4, '0')}`;

    const result = await prisma.$transaction(async (tx) => {
      let userId: string | undefined = undefined;

      // 1. Create User if credentials provided
      if (validated.email && validated.password) {
        const hashedPassword = await hash(validated.password, 12);
        const user = await tx.user.create({
          data: {
            name: `${validated.firstName} ${validated.lastName}`,
            email: validated.email,
            passwordHash: hashedPassword,
            role: (validated.role as UserRole) || "VIEWER",
            status: "ACTIVE"
          }
        });
        userId = user.id;
      }

      // 2. Create Employee
      const employee = await tx.employee.create({
        data: {
          employeeId,
          firstName: validated.firstName,
          lastName: validated.lastName,
          designation: validated.designation,
          department: validated.department,
          status: validated.status || "ACTIVE",
          userId: userId || validated.userId
        },
        include: { user: true }
      });

      return employee;
    });

    return NextResponse.json({ success: true, data: result }, { status: 201 });
  } catch (error: any) {
    console.error("POST Employee Error:", error);
    if (error instanceof z.ZodError) {
      return NextResponse.json({ success: false, error: error.errors[0].message }, { status: 400 });
    }
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
