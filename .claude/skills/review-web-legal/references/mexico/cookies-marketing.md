# Cookies, rastreo y comunicaciones comerciales

Verifica primero contra `references/mexico/sources.md`. **No copies mecánicamente el
modelo GDPR de "banner con opt-in previo obligatorio para toda cookie no esencial"** — el
marco mexicano no exige lo mismo que el europeo. Diferencia siempre:

- obligación jurídica mexicana verificada en esta corrida;
- buena práctica sin respaldo normativo directo;
- recomendación del propio skill.

## Qué detectar técnicamente

- Cookies propias (sesión de autenticación, preferencias) vs cookies/SDKs de terceros
  (analytics, pixeles publicitarios, remarketing).
- Almacenamiento local (`localStorage`, `sessionStorage`, IndexedDB) y qué guarda.
- Momento de ejecución: ¿el tracker corre antes de cualquier interacción del usuario, o
  solo después de una acción?
- Identificadores persistentes de dispositivo o usuario usados con fines distintos a la
  operación básica del sitio.

## Cómo evaluarlo

- Una cookie de sesión de autenticación propia normalmente es "estrictamente necesaria"
  para el funcionamiento del servicio — no suele requerir un aviso de cookies aparte, pero
  sí debe mencionarse dentro del aviso de privacidad general (qué se guarda, para qué).
- Analytics/pixeles de terceros con fines distintos a operar el sitio (marketing,
  remarketing, perfilamiento) sí deben estar declarados como tratamiento y como
  transferencia a un tercero en el aviso de privacidad — la pregunta jurídica de si además
  requieren un mecanismo de consentimiento específico (más allá de mencionarlo en el
  aviso) es `LEGAL_REVIEW_REQUIRED`, no algo que resuelvas tú solo con una regla fija.
- No existe fundamento en el marco mexicano actual para exigir el mismo banner de cookies
  estilo UE por defecto — si recomiendas uno, marca la recomendación como
  `BEST_PRACTICE` o `INDUSTRY_STANDARD`, nunca como `LEGAL_REQUIREMENT`, salvo que la
  verificación de esta corrida confirme lo contrario.

## Comunicaciones comerciales

- Si el sistema envía correos o mensajes promocionales (no transaccionales) a
  consumidores, verifica si existe mecanismo de baja/oposición real (no solo mencionado).
- Verifica REPEP si aplica marketing telefónico o SMS
  (`references/mexico/consumer-ecommerce.md`).
- Busca si existe regulación sectorial adicional aplicable (p. ej. normas oficiales
  mexicanas relevantes al sector del negocio) — solo si el perfil de la app lo amerita, no
  por defecto.
