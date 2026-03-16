/**
 * Admin DTO Validation Classes (OWASP A03 — Injection Prevention)
 * Uses class-validator for strict input validation on all admin endpoints
 */

import {
    IsString,
    IsNotEmpty,
    IsOptional,
    IsBoolean,
    IsEmail,
    IsEnum,
    IsArray,
    IsDateString,
    MaxLength,
    MinLength,
} from "class-validator"
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger"

// ============================================
// SYSTEM ALERT DTOs
// ============================================

export enum AlertSeverity {
    INFO = "info",
    WARNING = "warning",
    ERROR = "error",
    CRITICAL = "critical",
}

export class CreateSystemAlertDto {
    @ApiProperty({ description: "Alert title", maxLength: 200 })
    @IsString()
    @IsNotEmpty()
    @MinLength(3)
    @MaxLength(200)
    title: string

    @ApiProperty({ description: "Alert message", maxLength: 2000 })
    @IsString()
    @IsNotEmpty()
    @MinLength(5)
    @MaxLength(2000)
    message: string

    @ApiProperty({ enum: AlertSeverity, description: "Severity level" })
    @IsEnum(AlertSeverity)
    severity: AlertSeverity

    @ApiPropertyOptional({ description: "Whether the alert is global" })
    @IsOptional()
    @IsBoolean()
    isGlobal?: boolean

    @ApiPropertyOptional({ description: "Target roles for the alert", type: [String] })
    @IsOptional()
    @IsArray()
    @IsString({ each: true })
    targetRoles?: string[]

    @ApiPropertyOptional({ description: "Expiry date ISO string" })
    @IsOptional()
    @IsDateString()
    expiresAt?: string
}

export class UpdateSystemAlertDto {
    @ApiPropertyOptional({ maxLength: 200 })
    @IsOptional()
    @IsString()
    @MaxLength(200)
    title?: string

    @ApiPropertyOptional({ maxLength: 2000 })
    @IsOptional()
    @IsString()
    @MaxLength(2000)
    message?: string

    @ApiPropertyOptional({ enum: AlertSeverity })
    @IsOptional()
    @IsEnum(AlertSeverity)
    severity?: AlertSeverity

    @ApiPropertyOptional()
    @IsOptional()
    @IsBoolean()
    isGlobal?: boolean

    @ApiPropertyOptional()
    @IsOptional()
    @IsBoolean()
    isActive?: boolean
}

// ============================================
// PARTNERSHIP DTOs
// ============================================

export class CreatePartnershipDto {
    @ApiProperty({ description: "Partnership name", maxLength: 200 })
    @IsString()
    @IsNotEmpty()
    @MaxLength(200)
    name: string

    @ApiProperty({ description: "Partnership type", maxLength: 100 })
    @IsString()
    @IsNotEmpty()
    @MaxLength(100)
    type: string

    @ApiPropertyOptional({ description: "Contact person name", maxLength: 200 })
    @IsOptional()
    @IsString()
    @MaxLength(200)
    contactName?: string

    @ApiPropertyOptional({ description: "Contact email" })
    @IsOptional()
    @IsEmail()
    contactEmail?: string

    @ApiPropertyOptional({ description: "Partnership start date" })
    @IsOptional()
    @IsDateString()
    startDate?: string

    @ApiPropertyOptional({ description: "Partnership end date" })
    @IsOptional()
    @IsDateString()
    endDate?: string
}

// ============================================
// USER MANAGEMENT DTOs
// ============================================

export enum ReportStatusType {
    PENDING = "pending",
    INVESTIGATING = "investigating",
    RESOLVED = "resolved",
    DISMISSED = "dismissed",
}

export class SuspendUserDto {
    @ApiProperty({ description: "Reason for suspension", maxLength: 500 })
    @IsString()
    @IsNotEmpty()
    @MaxLength(500)
    reason: string
}

export class UpdateReportStatusDto {
    @ApiProperty({ description: "New status", enum: ReportStatusType })
    @IsEnum(ReportStatusType, { message: "Status must be: pending, investigating, resolved, or dismissed" })
    @IsNotEmpty()
    status: ReportStatusType

    @ApiPropertyOptional({ description: "Resolution notes", maxLength: 1000 })
    @IsOptional()
    @IsString()
    @MaxLength(1000)
    resolutionNotes?: string
}
