import {
  type CharacterPayloadWithRelations,
  CreateCharacterDto,
  CreateKnowsDto,
  RpgAssistantClient,
  UpdateCharacterDto,
  UpdateKnowsDto,
} from './httpClients/RpgAssistantClient';
import { VersionedCharacter } from './Models/VersionedCharacter';
import type { PageQuery } from './Models/PageQuery';
import type { UpdateCharacter } from './Models/UpdateCharacter';
import { Character } from '@/services/Models/Character.ts';
import { KnowRelation } from '@/services/Models/KnowRelation.ts';
import { VersionedKnowRelation } from '@/services/Models/VersionedKnowRelation.ts';
import type { UpdateKnowRelation } from '@/services/Models/UpdateKnowRelation.ts';
import { RelationPath } from '@/services/Models/RelationPath.ts';

export class RpgAssistantService {
  private _rpgAssistantClient: RpgAssistantClient;

  constructor(baseUrl: string) {
    this._rpgAssistantClient = new RpgAssistantClient(baseUrl);
  }

  private static toCharacter(payload: CharacterPayloadWithRelations): Character {
    const relations = (payload.knowCharacters ?? []).map(
      (k) => new KnowRelation(k.characterId, k.description, k.isStrongRelation),
    );

    return new Character(payload.id, payload.name, relations);
  }

  public async createCharacterAsync(name: string, signal?: AbortSignal): Promise<string> {
    const createCharacter = new CreateCharacterDto({
      name: name,
    });

    const resposne = await this._rpgAssistantClient.createCharacter(createCharacter, signal);

    return resposne.result;
  }

  public async getCharacterAsync(id: string, signal?: AbortSignal): Promise<VersionedCharacter> {
    const response = await this._rpgAssistantClient.getCharacterById(id, signal);
    return new VersionedCharacter(
      response.result.id,
      response.result.name,
      response.headers['etag'],
    );
  }

  public async updateCharacterAsync(updateCharacter: UpdateCharacter, signal?: AbortSignal) {
    const modelToUpdate = new UpdateCharacterDto({
      name: updateCharacter.name,
    });

    await this._rpgAssistantClient.updateCharacter(
      updateCharacter.id,
      updateCharacter.version,
      modelToUpdate,
      signal,
    );
  }

  public async deleteCharacterAsync(id: string, signal?: AbortSignal) {
    await this._rpgAssistantClient.deleteCharacter(id, signal);
  }

  public async getCharactersAsync(
    pageQuery: PageQuery,
    signal?: AbortSignal,
  ): Promise<Character[]> {
    const arrayOfCharacters = await this._rpgAssistantClient.getPagedCharacters(
      pageQuery.pageNumber,
      pageQuery.pageSize,
      pageQuery.sortType,
      pageQuery.sortOrder,
      undefined,
      signal,
    );

    return arrayOfCharacters.result.map((c) => RpgAssistantService.toCharacter(c));
  }

  public async createKnowRelationBetweenCharacters(
    fromId: string,
    toId: string,
    description: string,
    isStrongRelation: boolean,
    signal?: AbortSignal,
  ): Promise<string> {
    const createKnowRelation = new CreateKnowsDto({
      fromCharacterId: fromId,
      toCharacterId: toId,
      description: description,
      isStrongRelation: isStrongRelation,
    });

    return (await this._rpgAssistantClient.createKnowRelationship(createKnowRelation, signal))
      .result;
  }

  public async getKnowRelationAsync(
    fromId: string,
    toId: string,
    signal?: AbortSignal,
  ): Promise<VersionedKnowRelation> {
    const response = await this._rpgAssistantClient.getKnowRelationship(fromId, toId, signal);
    const relation = response.result;

    // The relation's version is carried by the ETag response header, not the
    // body (same as getCharacterAsync).
    return new VersionedKnowRelation(
      relation.fromCharacterId,
      relation.toCharacterId,
      relation.description,
      relation.isStrongRelation,
      response.headers['etag'],
    );
  }

  public async updateKnowRelationAsync(
    update: UpdateKnowRelation,
    signal?: AbortSignal,
  ): Promise<void> {
    const body = new UpdateKnowsDto({
      description: update.description,
      isStrongRelation: update.isStrongRelation,
    });

    await this._rpgAssistantClient.updateKnowRelationship(
      update.fromCharacterId,
      update.toCharacterId,
      update.version,
      body,
      signal,
    );
  }

  public async deleteKnowRelationBetweenCharacters(
    fromId: string,
    toId: string,
    signal?: AbortSignal,
  ): Promise<void> {
    return (await this._rpgAssistantClient.deleteKnowRelationship(fromId, toId, signal)).result;
  }

  public async searchCharactersByNameAsync(
    nameFilter: string,
    pageNumber: number,
    pageSize: number,
    signal?: AbortSignal,
  ): Promise<Character[]> {
    const response = await this._rpgAssistantClient.getPagedCharacters(
      pageNumber,
      pageSize,
      'name',
      'Asc',
      nameFilter,
      signal,
    );

    return response.result.map((c) => RpgAssistantService.toCharacter(c));
  }

  public async findRelationBetweenCharactersAsync(
    fromId: string,
    toId: string,
    signal?: AbortSignal,
  ): Promise<RelationPath> {
    const response = await this._rpgAssistantClient.findRelationBetweenCharacters(
      fromId,
      toId,
      undefined,
      signal,
    );

    return new RelationPath(response.result.characterIds ?? [], response.result.hops ?? 0);
  }
}
