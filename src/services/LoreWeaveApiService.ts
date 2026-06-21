import {
  type CharacterPayloadWithRelations,
  CreateCharacterDto,
  CreateKnowsDto,
  LoreWeaveApiClient,
  UpdateCharacterDto,
  UpdateKnowsDto,
} from './httpClients/LoreWeaveApiClient';
import { VersionedCharacter } from './Models/VersionedCharacter';
import type { PageQuery } from './Models/PageQuery';
import type { UpdateCharacter } from './Models/UpdateCharacter';
import { Character } from '@/services/Models/Character.ts';
import { KnowRelation } from '@/services/Models/KnowRelation.ts';
import { VersionedKnowRelation } from '@/services/Models/VersionedKnowRelation.ts';
import type { UpdateKnowRelation } from '@/services/Models/UpdateKnowRelation.ts';
import { RelationPath } from '@/services/Models/RelationPath.ts';

/**
 * Friendly wrapper around the NSwag-generated {@link LoreWeaveApiClient} that the
 * rest of the app talks to. It owns a single client instance, exposes `*Async`
 * methods taking an `AbortSignal`, and translates the generated DTOs into the
 * domain models under `services/Models/`. Components must use this, never the
 * raw client or axios (see `.claude/rules/http-client.md`).
 */
export class LoreWeaveApiService {
  private _loreWeaveApiClient: LoreWeaveApiClient;

  /** @param baseUrl API base URL ('' = same origin; absolute URL inside Foundry). */
  constructor(baseUrl: string) {
    this._loreWeaveApiClient = new LoreWeaveApiClient(baseUrl);
  }

  /** Map a generated character payload (+ its relations) to the domain {@link Character}. */
  private static toCharacter(payload: CharacterPayloadWithRelations): Character {
    const relations = (payload.knowCharacters ?? []).map(
      (k) => new KnowRelation(k.characterId, k.description, k.isStrongRelation),
    );

    return new Character(payload.id, payload.name, relations);
  }

  /**
   * Create a character.
   * @returns the new character's id.
   */
  public async createCharacterAsync(name: string, signal?: AbortSignal): Promise<string> {
    const createCharacter = new CreateCharacterDto({
      name: name,
    });

    const resposne = await this._loreWeaveApiClient.createCharacter(createCharacter, signal);

    return resposne.result;
  }

  /**
   * Fetch one character by id, including its `version` (read from the ETag
   * response header, not the body) for later concurrency-checked updates.
   */
  public async getCharacterAsync(id: string, signal?: AbortSignal): Promise<VersionedCharacter> {
    const response = await this._loreWeaveApiClient.getCharacterById(id, signal);
    return new VersionedCharacter(
      response.result.id,
      response.result.name,
      response.headers['etag'],
    );
  }

  /** Rename a character; `updateCharacter.version` (ETag) guards concurrent edits. */
  public async updateCharacterAsync(updateCharacter: UpdateCharacter, signal?: AbortSignal) {
    const modelToUpdate = new UpdateCharacterDto({
      name: updateCharacter.name,
    });

    await this._loreWeaveApiClient.updateCharacter(
      updateCharacter.id,
      updateCharacter.version,
      modelToUpdate,
      signal,
    );
  }

  /** Delete a character by id. */
  public async deleteCharacterAsync(id: string, signal?: AbortSignal) {
    await this._loreWeaveApiClient.deleteCharacter(id, signal);
  }

  /** Fetch a page of characters (with their relations) per the given {@link PageQuery}. */
  public async getCharactersAsync(
    pageQuery: PageQuery,
    signal?: AbortSignal,
  ): Promise<Character[]> {
    const arrayOfCharacters = await this._loreWeaveApiClient.getPagedCharacters(
      pageQuery.pageNumber,
      pageQuery.pageSize,
      pageQuery.sortType,
      pageQuery.sortOrder,
      undefined,
      signal,
    );

    return arrayOfCharacters.result.map((c) => LoreWeaveApiService.toCharacter(c));
  }

  /**
   * Create a directed "knows" relation from `fromId` to `toId`.
   * @returns the new relation's id.
   */
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

    return (await this._loreWeaveApiClient.createKnowRelationship(createKnowRelation, signal))
      .result;
  }

  /**
   * Fetch the relation between two characters, including its `version` (ETag) for
   * concurrency-checked updates.
   */
  public async getKnowRelationAsync(
    fromId: string,
    toId: string,
    signal?: AbortSignal,
  ): Promise<VersionedKnowRelation> {
    const response = await this._loreWeaveApiClient.getKnowRelationship(fromId, toId, signal);
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

  /** Edit a relation's description/strength; `update.version` (ETag) guards concurrency. */
  public async updateKnowRelationAsync(
    update: UpdateKnowRelation,
    signal?: AbortSignal,
  ): Promise<void> {
    const body = new UpdateKnowsDto({
      description: update.description,
      isStrongRelation: update.isStrongRelation,
    });

    await this._loreWeaveApiClient.updateKnowRelationship(
      update.fromCharacterId,
      update.toCharacterId,
      update.version,
      body,
      signal,
    );
  }

  /** Delete the relation from `fromId` to `toId`. */
  public async deleteKnowRelationBetweenCharacters(
    fromId: string,
    toId: string,
    signal?: AbortSignal,
  ): Promise<void> {
    return (await this._loreWeaveApiClient.deleteKnowRelationship(fromId, toId, signal)).result;
  }

  /** Search characters by name (paged, name-ascending). Backs the typeahead search. */
  public async searchCharactersByNameAsync(
    nameFilter: string,
    pageNumber: number,
    pageSize: number,
    signal?: AbortSignal,
  ): Promise<Character[]> {
    const response = await this._loreWeaveApiClient.getPagedCharacters(
      pageNumber,
      pageSize,
      'name',
      'Asc',
      nameFilter,
      signal,
    );

    return response.result.map((c) => LoreWeaveApiService.toCharacter(c));
  }

  /**
   * Find the shortest relation path between two characters.
   * @returns a {@link RelationPath}; `isEmpty` when no path exists.
   */
  public async findRelationBetweenCharactersAsync(
    fromId: string,
    toId: string,
    signal?: AbortSignal,
  ): Promise<RelationPath> {
    const response = await this._loreWeaveApiClient.findRelationBetweenCharacters(
      fromId,
      toId,
      undefined,
      signal,
    );

    return new RelationPath(response.result.characterIds ?? [], response.result.hops ?? 0);
  }
}
