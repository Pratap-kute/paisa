import {
  api,
  createAsyncState,
  createMutation,
  type DtoEditorFilesResponse,
  type DtoEditorSaveResponse,
  type DtoEditorValidateResponse,
  type DtoLedgerFileRequest,
  type DtoLedgerFileResponse,
} from "$lib/api";

export function createEditorFilesState() {
  return createAsyncState<void, DtoEditorFilesResponse | null>(
    async (_args, signal) => {
      const response = await api.editor.getEditorFiles({ signal });
      return response;
    },
    null,
  );
}

export function createEditorFileState() {
  return createAsyncState<DtoLedgerFileRequest, DtoLedgerFileResponse | null>(
    async (fileQuery, signal) => {
      const response = await api.editor.getEditorFile(fileQuery, { signal });
      return response;
    },
    null,
  );
}

export function createValidateFileState() {
  return createAsyncState<
    DtoLedgerFileRequest,
    DtoEditorValidateResponse | null
  >(
    async (fileQuery, signal) => {
      const response = await api.editor.validateEditorFile(fileQuery, {
        signal,
      });
      return response;
    },
    null,
  );
}

export function createSaveFileMutation() {
  return createMutation<DtoLedgerFileRequest, DtoEditorSaveResponse>(
    async (fileData) => {
      const response = await api.editor.saveEditorFile(fileData);
      return response;
    },
  );
}
