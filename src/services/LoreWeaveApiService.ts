import axios, { isAxiosError } from 'axios';
import {
  ApiException,
  type BoardDto,
  BoardConfigurationDto,
  type CharacterPayloadWithRelations,
  CreateBoardDto,
  CreateCharacterDto,
  CreateFactDto,
  CreateKnowsDto,
  LoreWeaveApiClient,
  UpdateBoardDto,
  UpdateCharacterDto,
  UpdateFactDto,
  UpdateKnowsDto,
} from './httpClients/LoreWeaveApiClient';
import { Board } from './Models/Board';
import { BoardConfiguration } from './Models/BoardConfiguration';
import { VersionedBoard } from './Models/VersionedBoard';
import type { UpdateBoard } from './Models/UpdateBoard';
import { VersionedCharacter } from './Models/VersionedCharacter';
import { PageQuery } from './Models/PageQuery';
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
 *
 * Every character/relation/fact request is scoped to the **active board** (one
 * board per RPG game). The host sets it once via {@link setActiveBoard} — the
 * Foundry module resolves the board from the world, the standalone SPA from
 * the board picker — and the wrapper injects the id into every call, so
 * components stay board-agnostic.
 */
export class LoreWeaveApiService {
  private _loreWeaveApiClient: LoreWeaveApiClient;
  private _activeBoardId: string | null = null;

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

  /**
   * Whether the error is an HTTP 412 (Precondition Failed) — the entity was
   * changed since its version (ETag) was read, e.g. by the Foundry document
   * sync. Update forms use this to reload fresh data and let the user retry.
   */
  public static isPreconditionFailedError(error: unknown): boolean {
    return isAxiosError(error) && error.response?.status === 412;
  }

  /** The board every character/relation/fact request is scoped to (null until the host picks one). */
  public get activeBoardId(): string | null {
    return this._activeBoardId;
  }

  /** Set (or clear) the active board. Call before any character/relation/fact request. */
  public setActiveBoard(boardId: string | null): void {
    this._activeBoardId = boardId;
  }

  /** The active board id, or throw — data requests without a board are always a wiring bug. */
  private requireBoardId(): string {
    if (!this._activeBoardId) {
      throw new Error('LoreWeaveApiService: no active board — call setActiveBoard() first.');
    }
    return this._activeBoardId;
  }

  /** Map a generated board configuration DTO to the domain {@link BoardConfiguration}. */
  private static toBoardConfiguration(dto: BoardConfigurationDto): BoardConfiguration {
    return new BoardConfiguration(
      dto.characterNodeColor,
      dto.factNodeColor,
      dto.relationEdgeColor,
      dto.factEdgeColor,
      dto.pathHighlightColor,
      dto.nodeRadius,
      dto.edgeWidth,
      dto.curvedEdges,
      dto.showGrid,
      dto.scalingObjects,
    );
  }

  /** Map a domain {@link BoardConfiguration} to the generated DTO. */
  private static toBoardConfigurationDto(configuration: BoardConfiguration): BoardConfigurationDto {
    return new BoardConfigurationDto({
      characterNodeColor: configuration.characterNodeColor,
      factNodeColor: configuration.factNodeColor,
      relationEdgeColor: configuration.relationEdgeColor,
      factEdgeColor: configuration.factEdgeColor,
      pathHighlightColor: configuration.pathHighlightColor,
      nodeRadius: configuration.nodeRadius,
      edgeWidth: configuration.edgeWidth,
      curvedEdges: configuration.curvedEdges,
      showGrid: configuration.showGrid,
      scalingObjects: configuration.scalingObjects,
    });
  }

  /** Map a generated board payload to the domain {@link Board}. */
  private static toBoard(dto: BoardDto): Board {
    return new Board(dto.id, dto.name, LoreWeaveApiService.toBoardConfiguration(dto.configuration));
  }

  /** Fetch every board (one per RPG game). */
  public async getBoardsAsync(signal?: AbortSignal): Promise<Board[]> {
    const response = await this._loreWeaveApiClient.getBoards(signal);
    return response.result.map((b) => LoreWeaveApiService.toBoard(b));
  }

  /**
   * Create a board with the backend's default configuration.
   * @returns the new board's id.
   */
  public async createBoardAsync(name: string, signal?: AbortSignal): Promise<string> {
    const createBoard = new CreateBoardDto({ name: name });
    const response = await this._loreWeaveApiClient.createBoard(createBoard, signal);
    return response.result;
  }

  /**
   * Fetch one board by id, including its `version` (read from the ETag
   * response header, not the body) for later concurrency-checked updates.
   */
  public async getBoardAsync(id: string, signal?: AbortSignal): Promise<VersionedBoard> {
    const response = await this._loreWeaveApiClient.getBoardById(id, signal);
    return new VersionedBoard(
      response.result.id,
      response.result.name,
      LoreWeaveApiService.toBoardConfiguration(response.result.configuration),
      response.headers['etag'],
    );
  }

  /**
   * Whether a board with the given id still exists on the backend. A 404 is a
   * normal negative answer here, not a failure — probe with a service
   * constructed **without** a notification service, or the interceptor will
   * toast the 404.
   */
  public async boardExistsAsync(id: string, signal?: AbortSignal): Promise<boolean> {
    try {
      await this._loreWeaveApiClient.getBoardById(id, signal);
      return true;
    } catch (error) {
      if (isAxiosError(error) && error.response?.status === 404) return false;
      // The NSwag client rethrows non-2xx responses as ApiException, so the
      // axios guard above never sees them.
      if (ApiException.isApiException(error) && error.status === 404) return false;
      throw error;
    }
  }

  /** Edit a board's name/configuration; `update.version` (ETag) guards concurrent edits. */
  public async updateBoardAsync(update: UpdateBoard, signal?: AbortSignal): Promise<void> {
    const body = new UpdateBoardDto({
      name: update.name,
      configuration: LoreWeaveApiService.toBoardConfigurationDto(update.configuration),
    });

    await this._loreWeaveApiClient.updateBoard(update.version, body, update.id, signal);
  }

  /** Delete a board together with all characters, relations and facts on it. */
  public async deleteBoardAsync(id: string, signal?: AbortSignal): Promise<void> {
    await this._loreWeaveApiClient.deleteBoard(id, signal);
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

    const resposne = await this._loreWeaveApiClient.createCharacter(
      createCharacter,
      this.requireBoardId(),
      signal,
    );

    return resposne.result;
  }

  /**
   * Fetch one character by id, including its `version` (read from the ETag
   * response header, not the body) for later concurrency-checked updates.
   */
  public async getCharacterAsync(id: string, signal?: AbortSignal): Promise<VersionedCharacter> {
    const response = await this._loreWeaveApiClient.getCharacterById(
      id,
      this.requireBoardId(),
      signal,
    );
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
      await this._loreWeaveApiClient.getCharacterById(id, this.requireBoardId(), signal);
      return true;
    } catch (error) {
      if (isAxiosError(error) && error.response?.status === 404) return false;
      // The NSwag client rethrows non-2xx responses as ApiException, so the
      // axios guard above never sees them.
      if (ApiException.isApiException(error) && error.status === 404) return false;
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
      this.requireBoardId(),
      signal,
    );
  }

  /** Delete a character by id. */
  public async deleteCharacterAsync(id: string, signal?: AbortSignal) {
    await this._loreWeaveApiClient.deleteCharacter(id, this.requireBoardId(), signal);
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
      this.requireBoardId(),
      signal,
    );

    return arrayOfCharacters.result.map((c) => LoreWeaveApiService.toCharacter(c));
  }

  /**
   * Fetch **every** character by walking the paged endpoint with the
   * contract's maximum page size (100) until a short page signals the end.
   * Used to (re)load the whole graph.
   */
  public async getAllCharactersAsync(signal?: AbortSignal): Promise<Character[]> {
    const pageSize = 100;
    // Safety valve against a backend that never returns a short page; 100
    // pages = 10k characters, far beyond anything the graph can render.
    const maxPages = 100;
    const all: Character[] = [];
    for (let pageNumber = 1; pageNumber <= maxPages; pageNumber++) {
      const page = await this.getCharactersAsync(
        new PageQuery(pageNumber, pageSize, 'name', 'Asc'),
        signal,
      );
      all.push(...page);
      if (page.length < pageSize) break;
    }
    return all;
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

    return (
      await this._loreWeaveApiClient.createKnowRelationship(
        createKnowRelation,
        this.requireBoardId(),
        signal,
      )
    ).result;
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
    const response = await this._loreWeaveApiClient.getKnowRelationship(
      fromId,
      toId,
      this.requireBoardId(),
      signal,
    );
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
      this.requireBoardId(),
      signal,
    );
  }

  /** Delete the relation from `fromId` to `toId`. */
  public async deleteKnowRelationBetweenCharacters(
    fromId: string,
    toId: string,
    signal?: AbortSignal,
  ): Promise<void> {
    return (
      await this._loreWeaveApiClient.deleteKnowRelationship(
        fromId,
        toId,
        this.requireBoardId(),
        signal,
      )
    ).result;
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
      this.requireBoardId(),
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
      this.requireBoardId(),
      signal,
    );

    return response.result;
  }

  /**
   * Fetch one fact by id, including its `version` (read from the ETag response
   * header, not the body) for later concurrency-checked updates.
   */
  public async getFactAsync(id: string, signal?: AbortSignal): Promise<VersionedFact> {
    const response = await this._loreWeaveApiClient.getFact(id, this.requireBoardId(), signal);
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

    await this._loreWeaveApiClient.updateFact(
      update.id,
      update.version,
      body,
      this.requireBoardId(),
      signal,
    );
  }

  /** Delete a fact by id (also removes its connections on the backend). */
  public async deleteFactAsync(id: string, signal?: AbortSignal): Promise<void> {
    await this._loreWeaveApiClient.deleteFact(id, this.requireBoardId(), signal);
  }

  /** Connect an existing fact to an existing character (HAS_FACT). */
  public async connectFactToCharacterAsync(
    characterId: string,
    factId: string,
    signal?: AbortSignal,
  ): Promise<void> {
    await this._loreWeaveApiClient.connectFactToCharacter(
      characterId,
      factId,
      this.requireBoardId(),
      signal,
    );
  }

  /** Remove the HAS_FACT connection between a character and a fact (keeps the fact). */
  public async disconnectFactFromCharacterAsync(
    characterId: string,
    factId: string,
    signal?: AbortSignal,
  ): Promise<void> {
    await this._loreWeaveApiClient.disconnectFactFromCharacter(
      characterId,
      factId,
      this.requireBoardId(),
      signal,
    );
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
      this.requireBoardId(),
      signal,
    );

    return new RelationPath(response.result.characterIds ?? [], response.result.hops ?? 0);
  }
}
