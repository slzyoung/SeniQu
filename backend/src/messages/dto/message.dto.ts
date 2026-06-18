import {
    IsString,
    IsOptional,
    IsUUID,
    MaxLength,
    MinLength,
} from "class-validator"
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger"

export class SendMessageDto {
    @ApiProperty({ description: "Recipient user ID" })
    @IsUUID()
    recipientId: string

    @ApiProperty({ description: "Encrypted message content (AES-GCM ciphertext, base64)" })
    @IsString()
    @MinLength(1)
    @MaxLength(10000)
    encryptedContent: string

    @ApiProperty({ description: "AES-GCM initialization vector (base64)" })
    @IsString()
    iv: string

    @ApiPropertyOptional({ description: "Sender's ephemeral public key for ECDH (base64, JWK)" })
    @IsOptional()
    @IsString()
    senderPublicKey?: string
}

export class GetConversationsDto {
    @ApiPropertyOptional()
    @IsOptional()
    @IsString()
    cursor?: string
}

export class GetMessagesDto {
    @ApiProperty({ description: "Other participant's user ID" })
    @IsUUID()
    participantId: string

    @ApiPropertyOptional()
    @IsOptional()
    @IsString()
    cursor?: string
}

export class ReportMessageDto {
    @ApiProperty()
    @IsUUID()
    messageId: string

    @ApiProperty()
    @IsString()
    @MaxLength(500)
    reason: string
}
