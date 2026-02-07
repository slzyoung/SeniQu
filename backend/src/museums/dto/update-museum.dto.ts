/**
 * Update Museum DTO - Partial update support
 */

import { PartialType } from "@nestjs/swagger"
import { CreateMuseumDto } from "./create-museum.dto"

export class UpdateMuseumDto extends PartialType(CreateMuseumDto) { }
