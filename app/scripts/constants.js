/**
 * Constantes globais do Prompt DRIVE
 */

/**
 * Constants Application
 */
const GOD_KEY_TO_PREMIUM_ACTIVATE = 'Kjajhist#@123';
const FREE_MAX_PROMPTS = 5;
const PREMIUM_LICENSE_DURATION_DAYS = 30;
/**
 * Constants Supabase 
 */
const SUPABASE_URL = 'https://aogrylqxlqdgfagaskiq.supabase.co';
const SUA_ANON_PUBLIC_KEY = 'sb_publishable_3spACG8Q6U3OTdgSBAfQog_cjb4t4rW';

/** Chrome.storage / localStorage key for access token */
const ACCESS_TOKEN_STORAGE_KEY = 'ACCESS_TOKEN_DO_USUARIO';
const USER_ID_STORAGE_KEY = 'USER_ID_DO_USUARIO';


/**
 * Constants Sales Landing Page
 */
const SALES_LANDING_PAGE_URL = 'https://www.sample.com';

/**
 * Documents IDs
 */
const DOM_IDS = {
  btnCreateFolder: '#btnCreateFolder',
  btnCreatePrompt: '#btnCreatePrompt',
  btnLicenseKey: '#btnLicenseKey',
  btnImportFolder: '#btnImportFolder',
  promptCounter: '#promptCounter',
  userPlanBadge: '#userPlanBadge',
  folderDialog: '#folderDialog',
  promptDialog: '#promptDialog',
  promptEditDialog: '#promptEditDialog',
  confirmDeletePromptDialog: '#confirmDeletePromptDialog',
  deleteFolderDialog: '#deleteFolderDialog',
  editFolderDialog: '#editFolderDialog',
  licenseDialog: '#licenseDialog',
  importDialog: '#importDialog',
  foldersContainer: '#foldersContainer',
  mainContent: '#mainContent',
  loginScreen: '#loginScreen',
  createAccountScreen: '#createAccountScreen',
  appContent: '#appContent'
};
/**
 * Toasts
 */
const TOAST_MESSAGES = {
  folderCreated: 'Pasta criada com sucesso',
  folderUpdated: 'Pasta atualizada com sucesso',
  folderError: 'Erro ao criar pasta',
  promptCreated: 'Prompt criado com sucesso',
  promptUpdated: 'Prompt atualizado com sucesso',
  promptDeleted: 'Prompt removido com sucesso',
  promptError: 'Erro ao processar prompt',
  folderDeleted: 'Pasta removida com sucesso',
  folderDeleteError: 'Erro ao remover pasta',
  folderDeleteNotAllowed: 'Não foi possível excluir a pasta',
  folderDuplicateName: 'Já existe uma pasta com esse nome',
  folderNameMismatch: 'O nome digitado não confere com o nome da pasta',
  limitReached: 'Limite do plano Free atingido (5 prompts)',
  premiumActivated: 'Premium ativado até',
  invalidKey: 'Chave inválida',
  premiumFeature: 'Recurso Premium - Ative o Premium para usar esta funcionalidade',
  shareSuccess: 'Prompt copiado para a área de transferência!',
  shareError: 'Falha ao compartilhar prompt',
  exportSuccess: 'Pasta exportada com sucesso!',
  exportError: 'Erro ao exportar pasta',
  importSuccess: 'Importação concluída com sucesso',
  importError: 'Erro ao importar pasta - verifique o formato do JSON'
};

/** Auth / Login */
const TOAST_AUTH = {
  loginError: 'E-mail ou senha incorretos',
  loginErrorGeneric: 'Erro ao fazer login. Tente novamente.',
  createUserSuccess: 'Usuário criado com sucesso',
  createUserError: 'Erro ao criar conta. Verifique os dados.',
  redirecting: 'Redirecionando...'
};

const PROMPT_PREVIEW_MAX_CHARS = 100;

const KEY_ICON_SVG = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 2l-2 2m-7.61 7.61a5.5 5.5 0 1 1-7.778 7.778 5.5 5.5 0 0 1 7.777-7.777zm0 0L15.5 7.5m0 0l3 3L22 7l-3-3m-3.5 3.5L19 4"/></svg>';
