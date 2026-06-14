import {
  CreateCharacterDto,
  CreateKnowsDto,
  RpgAssistantClient,
  UpdateCharacterDto,
} from './httpClients/RpgAssistantClient';
import { VersionedCharacter } from './Models/VersionedCharacter';
import type { PageQuery } from './Models/PageQuery';
import type { UpdateCharacter } from './Models/UpdateCharacter';
import { Character } from '@/services/Models/Character.ts';
import { RelationPath } from '@/services/Models/RelationPath.ts';

export class RpgAssistantService {
  private _rpgAssistantClient: RpgAssistantClient;

  constructor(baseUrl: string) {
    this._rpgAssistantClient = new RpgAssistantClient(baseUrl);
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

    return arrayOfCharacters.result.map((c) => new Character(c.id, c.name, c.knowCharacterIds));
  }

  public async createKnowRelationBetweenCharacters(
    fromId: string,
    toId: string,
    description: string,
    signal?: AbortSignal,
  ): Promise<string> {
    const createKnowRelation = new CreateKnowsDto({
      fromCharacterId: fromId,
      toCharacterId: toId,
      description: description,
    });

    return (await this._rpgAssistantClient.createKnowRelationship(createKnowRelation, signal))
      .result;
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

    return response.result.map((c) => new Character(c.id, c.name, c.knowCharacterIds));
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
