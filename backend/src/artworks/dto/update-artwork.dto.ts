import { PartialType } from "@nestjs/swagger"
import { CreateArtworkDto } from "./create-artwork.dto"

export class UpdateArtworkDto extends PartialType(CreateArtworkDto) { }
