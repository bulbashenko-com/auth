/**
 * Interface strings and translations of Kratos messages (by their stable numeric ids, see ory/kratos text/id.go).
 * A Kratos message without a translation is shown in Kratos' own English text.
 */

export const LOCALES = ["ru", "en"] as const
export type Locale = (typeof LOCALES)[number]
export const isLocale = (value: unknown): value is Locale => LOCALES.includes(value as Locale)

const ru = {
  "brand.section": "IDENTITY / SSO",
  "footer.online": "SYSTEM ONLINE",
  "footer.encrypted": "/ ENCRYPTED CONNECTION",
  "footer.secure": "[ SECURE BY DESIGN ]",
  "footer.stack": "ORY / OIDC",

  "login.label": "ACCESS PORTAL / 01",
  "login.title": "Вход",
  "login.desc": "Один аккаунт для всех сервисов bulbashenko.com.\nРегистрации нет — аккаунт выдаёт администратор.",
  "login.passkey": "[ ВОЙТИ С ПАСКЛЮЧОМ ]",
  "login.or-password": "или паролем",
  "login.submit": "[ ВОЙТИ ]",
  "login.reset": "[ Сбросить пароль? ]",
  "login.refresh.label": "ПОДТВЕРЖДЕНИЕ",
  "login.refresh.title": "Это вы?",
  "login.refresh.desc": "Для этого действия войдите ещё раз.",
  "login.2fa.label": "ВТОРОЙ ФАКТОР",
  "login.2fa.title": "Привет, {name}",
  "login.2fa.title-anon": "Ещё шаг",
  "login.2fa.desc": "Введите 6-значный код\nиз приложения-аутентификатора.",
  "login.2fa.code": "Одноразовый пароль",
  "login.2fa.code-hint": "TOTP / 6 DIGITS",
  "login.2fa.other": "[ Другой способ ]",
  "login.2fa.lookup": "[ Код восстановления ]",
  "login.2fa.lookup-label": "Код восстановления",
  "login.2fa.totp": "[ Код из приложения ]",
  "login.logout": "[ Выйти ]",
  "login.cancel": "[ Отмена ]",

  "field.username": "Имя пользователя",
  "field.username-hint": "USERNAME",
  "field.password": "Пароль",
  "field.password-hint": "PASSWORD",
  "field.email": "Почта",
  "field.email-hint": "EMAIL",
  "field.code": "Код из письма",
  "field.code-hint": "CODE",
  "field.name": "Имя",

  "recovery.label": "RECOVERY / 01",
  "recovery.title": "Сброс пароля",
  "recovery.desc": "Код для входа придёт\nна почту вашего аккаунта.",
  "recovery.sent.label": "RECOVERY / 02",
  "recovery.sent.title": "Проверьте почту",
  "recovery.sent.desc": "Если такой аккаунт есть, мы отправили письмо с кодом.\nВведите его ниже.",
  "recovery.submit": "[ ОТПРАВИТЬ КОД ]",
  "recovery.confirm": "[ ПОДТВЕРДИТЬ ]",
  "recovery.resend": "[ Отправить ещё раз ]",

  "verification.label": "VERIFY / 01",
  "verification.title": "Подтверждение почты",
  "verification.desc": "Введите код из письма.",
  "verification.done.title": "Почта подтверждена",
  "verification.done.desc": "Можно возвращаться к работе.",

  "settings.label": "ACCOUNT / SETTINGS",
  "settings.title": "Аккаунт",
  "settings.desc": "Пароль, паскеи, приложение-аутентификатор\nи коды восстановления.",
  "settings.section.password": "ПАРОЛЬ",
  "settings.section.passkey": "ПАСКЕИ",
  "settings.section.totp": "ПРИЛОЖЕНИЕ-АУТЕНТИФИКАТОР",
  "settings.section.lookup_secret": "КОДЫ ВОССТАНОВЛЕНИЯ",
  "settings.password.new": "Новый пароль",
  "settings.saved": "Сохранено.",
  "settings.signed-in-as": "Вы вошли как {name}",
  "settings.no-totp": "Добавьте приложение-аутентификатор: без него войти не получится.",

  "consent.label": "СОГЛАСИЕ",
  "consent.title": "Доступ",
  "consent.desc": "Приложение {client} просит\nдоступ к вашему аккаунту.",
  "consent.remember": "Запомнить решение для этого приложения",
  "consent.accept": "[ РАЗРЕШИТЬ ]",
  "consent.deny": "[ ОТКАЗАТЬ ]",
  "scope.openid": "Идентификатор аккаунта",
  "scope.profile": "Имя и логин",
  "scope.email": "Адрес почты",
  "scope.groups": "Группы",
  "scope.offline_access": "Доступ без повторного входа",

  "error.label": "ERROR",
  "error.title": "Ошибка",
  "error.desc": "Что-то пошло не так.",
  "error.back": "[ НА ЭКРАН ВХОДА ]",
  "error.denied.title": "Нет доступа",
  "error.denied.desc": "У вашего аккаунта нет доступа к этому приложению.",

  "logout.title": "Выход",
  "logout.desc": "Вы вышли из аккаунта.",

  "home.title": "Готово",
  "home.desc": "Вход выполнен.",
  "home.settings": "[ НАСТРОЙКИ АККАУНТА ]",
  "home.logout": "[ ВЫЙТИ ]",

  "admin.label": "ADMIN / USERS",
  "admin.title": "Пользователи",
  "admin.desc": "Аккаунты и группы. Изменения требуют входа не старше 15 минут.\nСсылку и код восстановления передайте человеку лично: они действуют час.",
  "admin.new": "Новый пользователь",
  "admin.create": "[ СОЗДАТЬ ]",
  "admin.groups": "Группы",
  "admin.save-groups": "[ СОХРАНИТЬ ГРУППЫ ]",
  "admin.revoke": "[ ЗАВЕРШИТЬ СЕССИИ ]",
  "admin.send-recovery": "[ ССЫЛКА ДЛЯ ВОССТАНОВЛЕНИЯ ]",
  "admin.disable": "[ ОТКЛЮЧИТЬ ]",
  "admin.enable": "[ ВКЛЮЧИТЬ ]",
  "admin.delete": "[ УДАЛИТЬ ]",
  "admin.inactive": "отключён",
  "admin.sessions": "Сессий: {n}",
  "admin.done": "Готово.",
} as const

export type Key = keyof typeof ru

const en: Record<Key, string> = {
  "brand.section": "IDENTITY / SSO",
  "footer.online": "SYSTEM ONLINE",
  "footer.encrypted": "/ ENCRYPTED CONNECTION",
  "footer.secure": "[ SECURE BY DESIGN ]",
  "footer.stack": "ORY / OIDC",

  "login.label": "ACCESS PORTAL / 01",
  "login.title": "Sign in",
  "login.desc": "One account for every bulbashenko.com service.\nNo sign-up: accounts are issued by the admin.",
  "login.passkey": "[ SIGN IN WITH PASSKEY ]",
  "login.or-password": "or with a password",
  "login.submit": "[ SIGN IN ]",
  "login.reset": "[ Forgot password? ]",
  "login.refresh.label": "CONFIRMATION",
  "login.refresh.title": "Is it you?",
  "login.refresh.desc": "Sign in again to continue.",
  "login.2fa.label": "SECOND FACTOR",
  "login.2fa.title": "Hi, {name}",
  "login.2fa.title-anon": "One more step",
  "login.2fa.desc": "Enter the 6-digit code\nfrom your authenticator app.",
  "login.2fa.code": "One-time code",
  "login.2fa.code-hint": "TOTP / 6 DIGITS",
  "login.2fa.other": "[ Another way ]",
  "login.2fa.lookup": "[ Recovery code ]",
  "login.2fa.lookup-label": "Recovery code",
  "login.2fa.totp": "[ Authenticator code ]",
  "login.logout": "[ Sign out ]",
  "login.cancel": "[ Cancel ]",

  "field.username": "Username",
  "field.username-hint": "USERNAME",
  "field.password": "Password",
  "field.password-hint": "PASSWORD",
  "field.email": "Email",
  "field.email-hint": "EMAIL",
  "field.code": "Code from the email",
  "field.code-hint": "CODE",
  "field.name": "Name",

  "recovery.label": "RECOVERY / 01",
  "recovery.title": "Reset password",
  "recovery.desc": "A sign-in code will be sent\nto your account's email.",
  "recovery.sent.label": "RECOVERY / 02",
  "recovery.sent.title": "Check your email",
  "recovery.sent.desc": "If the account exists, we sent an email with a code.\nEnter it below.",
  "recovery.submit": "[ SEND CODE ]",
  "recovery.confirm": "[ CONFIRM ]",
  "recovery.resend": "[ Send again ]",

  "verification.label": "VERIFY / 01",
  "verification.title": "Confirm email",
  "verification.desc": "Enter the code from the email.",
  "verification.done.title": "Email confirmed",
  "verification.done.desc": "You can carry on.",

  "settings.label": "ACCOUNT / SETTINGS",
  "settings.title": "Account",
  "settings.desc": "Password, passkeys, authenticator app\nand recovery codes.",
  "settings.section.password": "PASSWORD",
  "settings.section.passkey": "PASSKEYS",
  "settings.section.totp": "AUTHENTICATOR APP",
  "settings.section.lookup_secret": "RECOVERY CODES",
  "settings.password.new": "New password",
  "settings.saved": "Saved.",
  "settings.signed-in-as": "Signed in as {name}",
  "settings.no-totp": "Add an authenticator app: you cannot sign in without it.",

  "consent.label": "CONSENT",
  "consent.title": "Access",
  "consent.desc": "{client} asks for\naccess to your account.",
  "consent.remember": "Remember for this application",
  "consent.accept": "[ ALLOW ]",
  "consent.deny": "[ DENY ]",
  "scope.openid": "Account identifier",
  "scope.profile": "Name and username",
  "scope.email": "Email address",
  "scope.groups": "Groups",
  "scope.offline_access": "Access without signing in again",

  "error.label": "ERROR",
  "error.title": "Error",
  "error.desc": "Something went wrong.",
  "error.back": "[ BACK TO SIGN IN ]",
  "error.denied.title": "No access",
  "error.denied.desc": "Your account has no access to this application.",

  "logout.title": "Signed out",
  "logout.desc": "You are signed out.",

  "home.title": "Done",
  "home.desc": "You are signed in.",
  "home.settings": "[ ACCOUNT SETTINGS ]",
  "home.logout": "[ SIGN OUT ]",

  "admin.label": "ADMIN / USERS",
  "admin.title": "Users",
  "admin.desc": "Accounts and groups. Changes need a sign-in from the last 15 minutes.\nHand the recovery link and code over in person: they last one hour.",
  "admin.new": "New user",
  "admin.create": "[ CREATE ]",
  "admin.groups": "Groups",
  "admin.save-groups": "[ SAVE GROUPS ]",
  "admin.revoke": "[ END SESSIONS ]",
  "admin.send-recovery": "[ RECOVERY LINK ]",
  "admin.disable": "[ DISABLE ]",
  "admin.enable": "[ ENABLE ]",
  "admin.delete": "[ DELETE ]",
  "admin.inactive": "disabled",
  "admin.sessions": "Sessions: {n}",
  "admin.done": "Done.",
}

/** Kratos message ids → Russian. English uses Kratos' own text. */
const kratosRu: Record<number, string> = {
  1010001: "Войти",
  1010003: "Подтвердите, что это вы.",
  1010004: "Пройдите вторую проверку.",
  1010005: "Подтвердить",
  1010009: "Код из приложения",
  1010010: "Код восстановления",
  1010013: "Продолжить",
  1010021: "Войти с паскеем",
  1010022: "Войти паролем",
  1050001: "Изменения сохранены.",
  1050004: "Отвязать приложение-аутентификатор",
  1050005: "QR-код для приложения-аутентификатора",
  1050007: "Показать коды восстановления",
  1050008: "Сгенерировать новые коды",
  1050010: "Коды восстановления. Сохраните их в надёжном месте!",
  1050011: "Я сохранил коды",
  1050014: "Использован {0}",
  1050016: "Отключить",
  1050017: "Секрет приложения-аутентификатора, если QR-код не сканируется.",
  1050019: "Добавить паскей",
  1050020: "Удалить паскей «{0}»",
  1060001: "Аккаунт восстановлен. Задайте новый пароль и проверьте способы входа.",
  1060002: "Письмо с кодом восстановления отправлено, если такой адрес есть в системе.",
  1060003: "Письмо с кодом отправлено.",
  1070001: "Пароль",
  1070003: "Сохранить",
  1070006: "Проверить код",
  1070007: "Почта",
  1070008: "Отправить код ещё раз",
  1070009: "Продолжить",
  1070010: "Код восстановления",
  1070011: "Код подтверждения",
  1080001: "Письмо с кодом подтверждения отправлено.",
  1080002: "Почта подтверждена.",
  1080003: "Письмо с кодом подтверждения отправлено.",
  4000002: "Поле обязательно.",
  4000006: "Неверное имя пользователя или пароль.",
  4000008: "Код не подошёл. Попробуйте ещё раз.",
  4000010: "Аккаунт не активирован: подтвердите почту.",
  4000011: "Приложение-аутентификатор не настроено.",
  4000012: "Этот код восстановления уже использован.",
  4000014: "Коды восстановления не настроены.",
  4000016: "Код восстановления неверный.",
  4000031: "Пароль слишком похож на имя пользователя.",
  4000032: "Пароль слишком короткий.",
  4000034: "Этот пароль найден в утечках, выберите другой.",
  4000037: "Такого аккаунта нет или у него не настроен способ входа.",
  4000039: "Новый пароль должен отличаться от старого.",
  4000040: "Введите корректный адрес почты.",
  4010001: "Время на вход истекло, попробуйте ещё раз.",
  4050001: "Время на изменение истекло, попробуйте ещё раз.",
  4060004: "Ссылка недействительна или уже использована.",
  4060005: "Время на восстановление истекло, попробуйте ещё раз.",
  4060006: "Код неверный или уже использован.",
  4070005: "Время на подтверждение истекло, попробуйте ещё раз.",
  4070006: "Код неверный или уже использован.",
  5000002: "Нет доступных способов входа. Обратитесь к администратору.",
}

export type T = (key: Key, vars?: Record<string, string | number>) => string

export function translator(locale: Locale): T {
  const dict = locale === "en" ? en : ru
  return (key, vars) => fill(dict[key] ?? ru[key] ?? key, vars)
}

/** Text of a Kratos message or label in the given locale. */
export function kratosText(
  locale: Locale,
  message: { id: number; text: string; context?: object } | undefined,
): string {
  if (!message) return ""
  if (locale === "ru" && kratosRu[message.id]) {
    const ctx = (message.context ?? {}) as Record<string, unknown>
    const args = Object.values(ctx).map(String)
    return kratosRu[message.id].replace(/\{(\d)\}/g, (_, i: string) => args[Number(i)] ?? "")
  }
  return message.text
}

function fill(text: string, vars?: Record<string, string | number>) {
  if (!vars) return text
  return text.replace(/\{(\w+)\}/g, (_, name: string) => String(vars[name] ?? ""))
}
