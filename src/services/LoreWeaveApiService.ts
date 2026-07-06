import axios, { isAxiosError } from 'axios';
import {
  type CharacterPayloadWithRelations,
  CreateCharacterDto,
  CreateFactDto,
  CreateKnowsDto,
  LoreWeaveApiClient,
  UpdateCharacterDto,
  UpdateFactDto,
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
import { Fact } from '@/services/Models/Fact.ts';
import { VersionedFact } from '@/services/Models/VersionedFact.ts';
import type { UpdateFact } from '@/services/Models/UpdateFact.ts';
import type { NotificationService } from '@/services/NotificationService';

/**
 * Friendly wrapper around the NSwag-generated {@link LoreWeaveApiClient} that the
 * rest of the app talks to. It owns a single client instance, exposes `*Async`
 * methods taking an `AbortSignal`, and translates the generated DTOs into the
 * domain models under `services/Models/`. Components must use this, never the
 * raw client or axios (see `.claude/rules/http-client.md`).
 */
export class LoreWeaveApiService {
  private _loreWeaveApiClient: LoreWeaveApiClient;

  /**
   * @param baseUrl API base URL ('' = same origin; absolute URL inside Foundry).
   * @param notificationService When given, every 4xx/5xx response (and any
   *        network failure) is published as an error notification. The error
   *        still propagates to the caller unchanged.
   */
  constructor(baseUrl: string, notificationService?: NotificationService) {
    const instance = axios.create();

    if (notificationService) {
      instance.interceptors.response.use(
        (response) => response,
        (error: unknown) => {
          // One central hook for every endpoint. Aborted requests are the
          // caller's own doing — never toast those.
          if (isAxiosError(error) && error.code !== 'ERR_CANCELED') {
            notificationService.notifyHttpError(error.response?.status);
          }
          return Promise.reject(error);
        },
      );
    }

    this._loreWeaveApiClient = new LoreWeaveApiClient(baseUrl, instance);
  }

  /** Map a generated character payload (+ its relations and facts) to the domain {@link Character}. */
  private static toCharacter(payload: CharacterPayloadWithRelations): Character {
    const relations = (payload.knowCharacters ?? []).map(
      (k) => new KnowRelation(k.characterId, k.description, k.isStrongRelation),
    );
    const facts = (payload.facts ?? []).map((f) => new Fact(f.id, f.title, f.content));

    return new Character(payload.id, payload.name, relations, facts);
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

  /**
   * Whether a character with the given id still exists on the backend.
   * A 404 is a normal negative answer here, not a failure — probe with a
   * service constructed **without** a notification service, or the
   * interceptor will toast the 404.
   */
  public async characterExistsAsync(id: string, signal?: AbortSignal): Promise<boolean> {
    try {
      await this._loreWeaveApiClient.getCharacterById(id, signal);
      return true;
    } catch (error) {
      if (isAxiosError(error) && error.response?.status === 404) return false;
      throw error;
    }
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
   * Create a fact and connect it to the character `characterId`.
   * @returns the new fact's id.
   */
  public async addFactToCharacterAsync(
    characterId: string,
    title: string,
    content: string,
    signal?: AbortSignal,
  ): Promise<string> {
    const createFact = new CreateFactDto({
      title: title,
      content: content,
    });

    const response = await this._loreWeaveApiClient.addFactToCharacter(
      characterId,
      createFact,
      signal,
    );

    return response.result;
  }

  /**
   * Fetch one fact by id, including its `version` (read from the ETag response
   * header, not the body) for later concurrency-checked updates.
   */
  public async getFactAsync(id: string, signal?: AbortSignal): Promise<VersionedFact> {
    const response = await this._loreWeaveApiClient.getFact(id, signal);
    return new VersionedFact(
      response.result.id,
      response.result.title,
      response.result.content,
      response.headers['etag'],
    );
  }

  /** Edit a fact's title/content; `update.version` (ETag) guards concurrent edits. */
  public async updateFactAsync(update: UpdateFact, signal?: AbortSignal): Promise<void> {
    const body = new UpdateFactDto({
      title: update.title,
      content: update.content,
    });

    await this._loreWeaveApiClient.updateFact(update.id, update.version, body, signal);
  }

  /** Delete a fact by id (also removes its connections on the backend). */
  public async deleteFactAsync(id: string, signal?: AbortSignal): Promise<void> {
    await this._loreWeaveApiClient.deleteFact(id, signal);
  }

  /** Connect an existing fact to an existing character (HAS_FACT). */
  public async connectFactToCharacterAsync(
    characterId: string,
    factId: string,
    signal?: AbortSignal,
  ): Promise<void> {
    await this._loreWeaveApiClient.connectFactToCharacter(characterId, factId, signal);
  }

  /** Remove the HAS_FACT connection between a character and a fact (keeps the fact). */
  public async disconnectFactFromCharacterAsync(
    characterId: string,
    factId: string,
    signal?: AbortSignal,
  ): Promise<void> {
    await this._loreWeaveApiClient.disconnectFactFromCharacter(characterId, factId, signal);
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
