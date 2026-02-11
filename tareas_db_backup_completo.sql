--
-- PostgreSQL database dump
--

\restrict 9mGRHIEDNNkToWYAvZXpJ7418tc6kj79myfQq2IidDhgdgOZ4tXSf6UrMjX9i58

-- Dumped from database version 18.1
-- Dumped by pg_dump version 18.1

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

ALTER TABLE IF EXISTS ONLY public.tasks DROP CONSTRAINT IF EXISTS tasks_project_id_fkey;
ALTER TABLE IF EXISTS ONLY public.task_evidence DROP CONSTRAINT IF EXISTS task_evidence_task_id_fkey;
ALTER TABLE IF EXISTS ONLY public.projects DROP CONSTRAINT IF EXISTS projects_user_id_fkey;
ALTER TABLE IF EXISTS ONLY public.deleted_items DROP CONSTRAINT IF EXISTS deleted_items_user_id_fkey;
ALTER TABLE IF EXISTS ONLY public.users DROP CONSTRAINT IF EXISTS users_username_key;
ALTER TABLE IF EXISTS ONLY public.users DROP CONSTRAINT IF EXISTS users_pkey;
ALTER TABLE IF EXISTS ONLY public.tasks DROP CONSTRAINT IF EXISTS tasks_pkey;
ALTER TABLE IF EXISTS ONLY public.task_evidence DROP CONSTRAINT IF EXISTS task_evidence_pkey;
ALTER TABLE IF EXISTS ONLY public.projects DROP CONSTRAINT IF EXISTS projects_pkey;
ALTER TABLE IF EXISTS ONLY public.deleted_items DROP CONSTRAINT IF EXISTS deleted_items_pkey;
ALTER TABLE IF EXISTS public.users ALTER COLUMN id DROP DEFAULT;
ALTER TABLE IF EXISTS public.tasks ALTER COLUMN id DROP DEFAULT;
ALTER TABLE IF EXISTS public.task_evidence ALTER COLUMN id DROP DEFAULT;
ALTER TABLE IF EXISTS public.projects ALTER COLUMN id DROP DEFAULT;
ALTER TABLE IF EXISTS public.deleted_items ALTER COLUMN id DROP DEFAULT;
DROP SEQUENCE IF EXISTS public.users_id_seq;
DROP TABLE IF EXISTS public.users;
DROP SEQUENCE IF EXISTS public.tasks_id_seq;
DROP TABLE IF EXISTS public.tasks;
DROP SEQUENCE IF EXISTS public.task_evidence_id_seq;
DROP TABLE IF EXISTS public.task_evidence;
DROP SEQUENCE IF EXISTS public.projects_id_seq;
DROP TABLE IF EXISTS public.projects;
DROP SEQUENCE IF EXISTS public.deleted_items_id_seq;
DROP TABLE IF EXISTS public.deleted_items;
SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: deleted_items; Type: TABLE; Schema: public; Owner: root
--

CREATE TABLE public.deleted_items (
    id integer NOT NULL,
    item_id integer NOT NULL,
    item_type text NOT NULL,
    user_id integer,
    deleted_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.deleted_items OWNER TO root;

--
-- Name: deleted_items_id_seq; Type: SEQUENCE; Schema: public; Owner: root
--

CREATE SEQUENCE public.deleted_items_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.deleted_items_id_seq OWNER TO root;

--
-- Name: deleted_items_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: root
--

ALTER SEQUENCE public.deleted_items_id_seq OWNED BY public.deleted_items.id;


--
-- Name: projects; Type: TABLE; Schema: public; Owner: root
--

CREATE TABLE public.projects (
    id integer NOT NULL,
    title text NOT NULL,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    is_archived boolean DEFAULT false,
    deleted_at timestamp without time zone,
    user_id integer
);


ALTER TABLE public.projects OWNER TO root;

--
-- Name: projects_id_seq; Type: SEQUENCE; Schema: public; Owner: root
--

CREATE SEQUENCE public.projects_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.projects_id_seq OWNER TO root;

--
-- Name: projects_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: root
--

ALTER SEQUENCE public.projects_id_seq OWNED BY public.projects.id;


--
-- Name: task_evidence; Type: TABLE; Schema: public; Owner: root
--

CREATE TABLE public.task_evidence (
    id integer NOT NULL,
    task_id integer,
    file_path text NOT NULL,
    file_type text,
    uploaded_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.task_evidence OWNER TO root;

--
-- Name: task_evidence_id_seq; Type: SEQUENCE; Schema: public; Owner: root
--

CREATE SEQUENCE public.task_evidence_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.task_evidence_id_seq OWNER TO root;

--
-- Name: task_evidence_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: root
--

ALTER SEQUENCE public.task_evidence_id_seq OWNED BY public.task_evidence.id;


--
-- Name: tasks; Type: TABLE; Schema: public; Owner: root
--

CREATE TABLE public.tasks (
    id integer NOT NULL,
    project_id integer,
    descripcion text NOT NULL,
    fecha_objetivo date,
    completada boolean DEFAULT false,
    fecha_creacion timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    report_content text,
    deleted_at timestamp without time zone,
    start_date date
);


ALTER TABLE public.tasks OWNER TO root;

--
-- Name: tasks_id_seq; Type: SEQUENCE; Schema: public; Owner: root
--

CREATE SEQUENCE public.tasks_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.tasks_id_seq OWNER TO root;

--
-- Name: tasks_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: root
--

ALTER SEQUENCE public.tasks_id_seq OWNED BY public.tasks.id;


--
-- Name: users; Type: TABLE; Schema: public; Owner: root
--

CREATE TABLE public.users (
    id integer NOT NULL,
    username text NOT NULL,
    password text NOT NULL,
    role text DEFAULT 'user'::text,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.users OWNER TO root;

--
-- Name: users_id_seq; Type: SEQUENCE; Schema: public; Owner: root
--

CREATE SEQUENCE public.users_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.users_id_seq OWNER TO root;

--
-- Name: users_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: root
--

ALTER SEQUENCE public.users_id_seq OWNED BY public.users.id;


--
-- Name: deleted_items id; Type: DEFAULT; Schema: public; Owner: root
--

ALTER TABLE ONLY public.deleted_items ALTER COLUMN id SET DEFAULT nextval('public.deleted_items_id_seq'::regclass);


--
-- Name: projects id; Type: DEFAULT; Schema: public; Owner: root
--

ALTER TABLE ONLY public.projects ALTER COLUMN id SET DEFAULT nextval('public.projects_id_seq'::regclass);


--
-- Name: task_evidence id; Type: DEFAULT; Schema: public; Owner: root
--

ALTER TABLE ONLY public.task_evidence ALTER COLUMN id SET DEFAULT nextval('public.task_evidence_id_seq'::regclass);


--
-- Name: tasks id; Type: DEFAULT; Schema: public; Owner: root
--

ALTER TABLE ONLY public.tasks ALTER COLUMN id SET DEFAULT nextval('public.tasks_id_seq'::regclass);


--
-- Name: users id; Type: DEFAULT; Schema: public; Owner: root
--

ALTER TABLE ONLY public.users ALTER COLUMN id SET DEFAULT nextval('public.users_id_seq'::regclass);


--
-- Data for Name: deleted_items; Type: TABLE DATA; Schema: public; Owner: root
--



--
-- Data for Name: projects; Type: TABLE DATA; Schema: public; Owner: root
--

INSERT INTO public.projects VALUES (1, 'oracle linux', '2026-02-06 15:48:43.563321', false, NULL, 1);
INSERT INTO public.projects VALUES (2, 'Desarrollo en software impresiones:', '2026-02-06 15:57:42.154423', false, NULL, 1);
INSERT INTO public.projects VALUES (4, 'Manejo de correos institucionales:', '2026-02-06 15:59:19.735944', false, NULL, 1);
INSERT INTO public.projects VALUES (5, 'Servidor:', '2026-02-06 15:59:41.328968', false, NULL, 1);
INSERT INTO public.projects VALUES (6, 'Otros', '2026-02-06 16:00:05.153298', false, NULL, 1);
INSERT INTO public.projects VALUES (14, 'FORTINET', '2026-02-09 11:25:52.067436', false, NULL, 1);
INSERT INTO public.projects VALUES (16, 'PRUEBA42', '2026-02-09 15:12:59.550703', false, NULL, 1);
INSERT INTO public.projects VALUES (20, 's', '2026-02-11 15:39:09.485935', false, NULL, 19);
INSERT INTO public.projects VALUES (21, 'prueba3', '2026-02-11 15:50:11.249021', true, NULL, 1);


--
-- Data for Name: task_evidence; Type: TABLE DATA; Schema: public; Owner: root
--

INSERT INTO public.task_evidence VALUES (3, 14, 'uploads/1770412154142-558230697.jpeg', 'image/jpeg', '2026-02-06 16:09:14.185239');
INSERT INTO public.task_evidence VALUES (18, 33, 'uploads/1770646968028-158523276.png', 'image/png', '2026-02-09 09:22:48.093052');
INSERT INTO public.task_evidence VALUES (19, 33, 'uploads/1770646999327-578765264.png', 'image/png', '2026-02-09 09:23:19.389508');
INSERT INTO public.task_evidence VALUES (20, 33, 'uploads/1770647712344-905340833.png', 'image/png', '2026-02-09 09:35:12.431453');
INSERT INTO public.task_evidence VALUES (21, 33, 'uploads/1770648010158-169444125.png', 'image/png', '2026-02-09 09:40:10.246824');
INSERT INTO public.task_evidence VALUES (22, 33, 'uploads/1770650127547-98366837.png', 'image/png', '2026-02-09 10:15:27.623084');
INSERT INTO public.task_evidence VALUES (23, 33, 'uploads/1770650670961-671213102.png', 'image/png', '2026-02-09 10:24:31.014825');
INSERT INTO public.task_evidence VALUES (24, 33, 'uploads/1770654013924-155383895.png', 'image/png', '2026-02-09 11:20:13.975397');
INSERT INTO public.task_evidence VALUES (25, 33, 'uploads/1770667146440-346250459.png', 'image/png', '2026-02-09 14:59:06.48872');
INSERT INTO public.task_evidence VALUES (26, 38, 'uploads/1770785547505-171342580.png', 'image/png', '2026-02-10 23:52:27.618123');
INSERT INTO public.task_evidence VALUES (27, 18, 'uploads/1770846175165-683573627.png', 'image/png', '2026-02-11 16:42:55.373399');
INSERT INTO public.task_evidence VALUES (28, 46, 'uploads/1770846927743-48175543.webp', 'image/webp', '2026-02-11 16:55:27.913636');


--
-- Data for Name: tasks; Type: TABLE DATA; Schema: public; Owner: root
--

INSERT INTO public.tasks VALUES (3, 1, '-	Comentario RDBMS. ', NULL, false, '2026-02-06 15:57:22.929647', NULL, NULL, NULL);
INSERT INTO public.tasks VALUES (4, 1, '-	subir base de datos a ORACLE APEX', NULL, false, '2026-02-06 15:57:29.720739', NULL, NULL, NULL);
INSERT INTO public.tasks VALUES (5, 1, '-	Desarrollo de la aplicación web.', NULL, false, '2026-02-06 15:57:33.592843', NULL, NULL, NULL);
INSERT INTO public.tasks VALUES (7, 2, '-	Ajustes de código en backend para por la migración de base de datos', NULL, false, '2026-02-06 15:57:54.320686', NULL, NULL, NULL);
INSERT INTO public.tasks VALUES (8, 2, '-	Implementación de serial al apartado de las impresoras.', NULL, false, '2026-02-06 15:58:08.487512', NULL, NULL, NULL);
INSERT INTO public.tasks VALUES (9, 2, '-	Implementación de smtp para reconocimiento de correos automáticos.', NULL, false, '2026-02-06 15:59:10.862339', NULL, NULL, NULL);
INSERT INTO public.tasks VALUES (33, 2, '- Agregar usuarios de cada oficina al software con su recpectivo codigo de usuario', NULL, false, '2026-02-09 09:15:20.15951', 'La evidencia visual proporcionada exhibe un sistema de gestión centralizado para usuarios y dispositivos, específicamente enfocado en equipos de impresión multifunción (MFP), operando bajo la denominación de "SEDCAUCA Impresoras" para la "Gobernación del Cauca". La primera imagen presenta una interfaz gráfica de usuario (GUI) web que detalla un inventario de "Usuarios de Impresiones," listando sus identificadores, nombres, una dirección de correo electrónico institucional uniforme (infraestructura.sise@cauca.gov.co), asignación de oficina y departamento, con indicadores de estado de "Completado" o "Incompleto," y funciones de edición y eliminación. La segunda imagen muestra el panel de control principal de "Gestión de Usuarios," donde se resumen métricas clave como "284 Usuarios de Impresiones," de los cuales solo "10 Con Nombres" y "2 Con Oficinas," lo que resulta en un bajo índice de "Completitud" del 4%; esta interfaz también ofrece capacidades de búsqueda y filtrado de usuarios. Las imágenes restantes (3 a 7) corresponden a interfaces de configuración de "Cuentas del dispositivo" para modelos específicos de MFP, incluyendo "ECOSYS M3550idn" y "ECOSYS M3560idn," identificados por direcciones IP dentro de un segmento de red privada (10.10.x.x). Estas vistas de dispositivo detallan las "ID de la cuenta," "Nombre de cuenta" (incluyendo nombres individuales, una cuenta "SISE" con ID 808080, y una cuenta "Otro"), y un contador de "Impresiones," el cual registra consistentemente un valor de "0" para todas las cuentas mostradas en las instantáneas. Se observa una disparidad entre el bajo número de usuarios con nombres en el panel de control web y la mayor cantidad de cuentas con nombres específicos listadas en las configuraciones de los dispositivos individuales, sugiriendo que la métrica de "Con Nombres" del panel web podría referirse a un criterio de completitud de perfil más amplio o a un subconjunto específico de usuarios registrados en el sistema central.', NULL, NULL);
INSERT INTO public.tasks VALUES (6, 2, '-	Migración de base de datos supabase a postgresql ', NULL, false, '2026-02-06 15:57:52.541769', NULL, NULL, NULL);
INSERT INTO public.tasks VALUES (1, 1, '-	Ajuste de base de datos.', '2026-02-13', false, '2026-02-06 15:48:54.105942', NULL, NULL, NULL);
INSERT INTO public.tasks VALUES (2, 1, '-	Ajustes de prefijos FO.', '2026-02-20', false, '2026-02-06 15:57:16.144482', NULL, NULL, NULL);
INSERT INTO public.tasks VALUES (19, 6, '-	Crear un script de este ejecutable que realice la unión de los Excel en una cosa hoja de manera automática con el ejecutable para el PAE.', '2026-02-09', false, '2026-02-06 16:00:13.93997', 'sasasASAS', NULL, NULL);
INSERT INTO public.tasks VALUES (10, 4, '-	Depuración de correos.', '2026-02-09', false, '2026-02-06 15:59:27.215399', NULL, NULL, '2026-02-09');
INSERT INTO public.tasks VALUES (13, 5, '-	Levantar ticketssedcauca.com y de más servicios por conflicto de 443', '2026-02-05', false, '2026-02-06 15:59:45.849505', NULL, NULL, NULL);
INSERT INTO public.tasks VALUES (16, 5, '-	Marzo instalación y configuración de servidores nuevos', '2026-03-31', false, '2026-02-06 15:59:57.066527', NULL, NULL, NULL);
INSERT INTO public.tasks VALUES (14, 5, '-	Subir contenedor Docker de software de impresiones.', '2026-02-02', false, '2026-02-06 15:59:49.887027', 'sasasas', NULL, NULL);
INSERT INTO public.tasks VALUES (17, 5, '-	Backups en la nas del servidor actual al servidor nuevo', '2026-02-19', false, '2026-02-06 16:00:00.917355', NULL, NULL, '2026-02-10');
INSERT INTO public.tasks VALUES (15, 5, '-	Depurar contenedores que no se están utilizando.', '2026-02-16', false, '2026-02-06 15:59:53.915447', NULL, NULL, '2026-02-07');
INSERT INTO public.tasks VALUES (27, 5, 'manetimiento del servidores', '2026-02-09', false, '2026-02-08 23:40:57.899279', NULL, NULL, '2026-02-09');
INSERT INTO public.tasks VALUES (11, 4, '-	Backup de correo,', '2026-02-10', false, '2026-02-06 15:59:30.919843', NULL, NULL, '2026-02-10');
INSERT INTO public.tasks VALUES (12, 4, '-	Hacer un flayer informativo de conocimiento de almacenamiento en la nube y ya no mas uso de USB. ', '2026-02-12', false, '2026-02-06 15:59:36.569303', NULL, NULL, '2026-02-12');
INSERT INTO public.tasks VALUES (45, 16, 'tes1', '2026-07-22', true, '2026-02-11 10:16:15.794694', NULL, NULL, '2026-01-22');
INSERT INTO public.tasks VALUES (47, 16, '1', NULL, false, '2026-02-11 14:27:03.064721', NULL, NULL, NULL);
INSERT INTO public.tasks VALUES (48, 16, '3', NULL, false, '2026-02-11 14:27:04.583369', NULL, NULL, NULL);
INSERT INTO public.tasks VALUES (49, 16, '4', NULL, false, '2026-02-11 14:27:06.367096', NULL, '2026-02-11 15:14:18.663362', NULL);
INSERT INTO public.tasks VALUES (38, 16, 'TEST_FECHA_10_15', '2026-02-14', false, '2026-02-09 15:15:27.310143', 'Informe de Evaluación de Seguridad: Prueba de Penetración (Pentesting)

El presente informe describe el alcance, los objetivos y la metodología general asociada a una prueba de penetración (pentesting), una evaluación de seguridad proactiva fundamental para identificar y mitigar vulnerabilidades en los sistemas de información de una organización. Una prueba de penetración es una simulación controlada de un ataque cibernético real, ejecutada por profesionales de seguridad informática, con el fin de descubrir debilidades explotables antes de que puedan ser aprovechadas por actores maliciosos.

Objetivos de la Prueba de Penetración

Los objetivos primarios de una prueba de penetración suelen incluir:

Identificación de Vulnerabilidades: Descubrir debilidades de seguridad en aplicaciones web, infraestructuras de red, sistemas operativos, bases de datos y otros componentes críticos.
Evaluación de Impacto: Determinar el riesgo potencial y el impacto operativo que resultaría de la explotación exitosa de las vulnerabilidades detectadas.
Validación de Controles de Seguridad: Evaluar la eficacia de las medidas de seguridad existentes, incluyendo firewalls, sistemas de detección de intrusiones (IDS/IPS) y políticas de seguridad.
Cumplimiento Normativo: Ayudar a las organizaciones a cumplir con los requisitos de seguridad establecidos por diversas regulaciones y estándares de la industria.
Recomendaciones Accionables: Proporcionar orientación clara y práctica para la remediación de las vulnerabilidades identificadas, mejorando así la postura de seguridad general.

Metodología General de una Prueba de Penetración

Una prueba de penetración se lleva a cabo siguiendo una metodología estructurada, la cual puede variar ligeramente según el alcance y el tipo de evaluación, pero generalmente abarca las siguientes fases:

Fase de Planificación y Reconocimiento:
Definición del alcance del proyecto, incluyendo los activos a evaluar, las reglas de engagement y las limitaciones.
Recopilación de información pública y no pública sobre el objetivo (footprinting y reconnaissance) para identificar puntos de entrada potenciales.

Fase de Escaneo:
Utilización de herramientas automatizadas para escanear redes y aplicaciones en busca de puertos abiertos, servicios vulnerables y posibles configuraciones erróneas.
Análisis de vulnerabilidades para correlacionar las debilidades identificadas con bases de datos de vulnerabilidades conocidas.

Fase de Explotación:
Intentos controlados de explotar las vulnerabilidades descubiertas para confirmar su existencia y evaluar el nivel de acceso o control que se podría obtener.
Se pueden simular ataques como inyección SQL, cross-site scripting (XSS), escalada de privilegios o acceso no autorizado a sistemas.

Fase de Post-Explotación:
Una vez que se ha logrado la explotación, esta fase se centra en determinar el valor de los activos comprometidos y en la capacidad de mantener el acceso o expandir el control a otros sistemas dentro de la red.
Se evalúa la posibilidad de exfiltración de datos o el establecimiento de puertas traseras.

Fase de Análisis y Reporte:
Documentación exhaustiva de todas las vulnerabilidades encontradas, incluyendo la descripción, el nivel de severidad (alta, media, baja) y la evidencia de su explotación.
Análisis detallado del impacto potencial para el negocio.
Formulación de recomendaciones específicas y priorizadas para la mitigación de cada vulnerabilidad y para la mejora continua de la seguridad.

Entregables y Valor Añadido

El entregable principal de una prueba de penetración es un informe técnico detallado, que incluye un resumen ejecutivo para la dirección, una descripción pormenorizada de las vulnerabilidades, la metodología empleada, las pruebas realizadas, y un plan de acción para la remediación. Este informe proporciona a la organización una visión objetiva de su situación de seguridad, permitiendo una toma de decisiones informada para la asignación de recursos y la implementación de mejoras. La ejecución periódica de pruebas de penetración es un componente crítico en cualquier estrategia de ciberseguridad robusta, reforzando la capacidad de la organización para defenderse contra las amenazas cibernéticas en constante evolución.', '2026-02-11 15:16:59.351409', '2026-02-09');
INSERT INTO public.tasks VALUES (50, 20, 'sz', NULL, false, '2026-02-11 15:39:13.40499', NULL, NULL, NULL);
INSERT INTO public.tasks VALUES (51, 21, '12', NULL, false, '2026-02-11 15:50:14.185215', NULL, NULL, NULL);
INSERT INTO public.tasks VALUES (18, 6, '-	Crear un ejecutable donde se ejecute de manera automática la descarga de archivos Excel de la pagina sigsa del DANE para el PAE.', '2026-02-09', false, '2026-02-06 16:00:09.679753', 'El análisis de la evidencia visual revela una interfaz gráfica que simula un mapa de progreso educativo, titulado prominentemente "APRENDEAVENTURAS ESCOLAR", con una fecha y hora indicadas en la esquina superior derecha (Jueves, 29 de Enero de 2026 9:19:26 AM). En el centro superior, se observa un indicador de "PROGRESO: 0/3 RUTAS COMPLETADAS", sugiriendo un sistema de seguimiento de tareas. La escena presenta un paisaje campestre estilizado con colinas verdes ondulantes y un cielo azul claro con nubes blancas. Tres rutas sinuosas de camino marrón, bordeadas de piedras o líneas discontinuas blancas, se ramifican desde un punto común inferior y convergen hacia una casa de tejado rojo y paredes claras, ubicada en la cima de una colina central. Cada ruta está asociada a una "Ruta" temática, delineada en recuadros flotantes sobre el paisaje. La "RUTA 1: ALFABETIZACIÓN FÓNICA" (color azul claro), ubicada a la izquierda, incluye la descripción "Aprende los sonidos y letras" y está ilustrada con un libro verde rotulado con una ''A'' y un niño sonriente sosteniendo papeles. Se asocia a la dirección "pagina_alfabetizción.html". La "RUTA 2: MATEMÁTICAS BÁSICAS" (color crema), posicionada en el centro, detalla "Suma, resta y figuras." e incorpora un ábaco, bloques de colores con letras y números (''1'', ''B'', ''5'', ''3'', ''A'', ''C''), y representaciones numéricas y figurativas (''1'', ''3'', ''A'', una figura roja con ojos). Se vincula a "pagina_matemtiascias.html". La "RUTA 3: CIENCIAS NATURALES" (color verde claro), situada a la derecha, indica "Explora lo mundo vivo" y está ilustrada con un esqueleto de dinosaurio acompañado por un pequeño pájaro, y un árbol con una lupa. Su enlace asociado es "pagina_ciencias.html". El entorno de las rutas presenta elementos adicionales como un pequeño ábaco en la parte inferior y una valla de madera marrón en la parte inferior derecha. La estética general es de dibujos animados, limpia y orientada a un público infantil o educativo.', NULL, NULL);
INSERT INTO public.tasks VALUES (46, 16, '22', NULL, false, '2026-02-11 14:27:00.97798', 'El elemento visual analizado es una composición gráfica bidimensional que integra un isotipo y un logotipo. Se presenta en una paleta de colores dicromática de negro sobre blanco.

El isotipo, ubicado en la parte superior, es una representación abstracta y estilizada que emula una forma de "V" o un chevrón invertido. Está co2222mpuesto por múltiples segmentos poligonales de color negro sólido. Estos segmentos incluyen un paralelogramo inclinado en el extremo izquierdo, seguido por dos formas trapezoidales verticales adyacentes que configuran la sección central. En el extremo derecho, se observan dos formas rectangulares o trapezoidales más pequeñas, separadas por un espacio horizontal, lo que crea un efecto de fragmentación o superposición.

La tipografía, que conforma el logotipo, está situada debajo del isotipo y alineada centralmente. Presenta las palabras "TUF GAMING" en mayúsculas, utilizando una fuente sans-serif audaz y de carácter geométrico. Su diseño complementa la estética angular y robusta del símbolo superior.

La imagen exhibe una alta resolución y contraste, sin evidencia de artefactos de compresión, distorsiones o daños superficiales. Esto sugiere un origen digital y una reproducción fiel del diseño original. El fondo es un campo blanco uniforme que realza la nitidez y definición de los elementos negros.', NULL, NULL);


--
-- Data for Name: users; Type: TABLE DATA; Schema: public; Owner: root
--

INSERT INTO public.users VALUES (1, 'admin', 'admin123', 'admin', '2026-02-11 14:42:20.673359');
INSERT INTO public.users VALUES (19, 'andrez', 'andrez123', 'user', '2026-02-11 15:14:53.65461');


--
-- Name: deleted_items_id_seq; Type: SEQUENCE SET; Schema: public; Owner: root
--

SELECT pg_catalog.setval('public.deleted_items_id_seq', 1, false);


--
-- Name: projects_id_seq; Type: SEQUENCE SET; Schema: public; Owner: root
--

SELECT pg_catalog.setval('public.projects_id_seq', 21, true);


--
-- Name: task_evidence_id_seq; Type: SEQUENCE SET; Schema: public; Owner: root
--

SELECT pg_catalog.setval('public.task_evidence_id_seq', 28, true);


--
-- Name: tasks_id_seq; Type: SEQUENCE SET; Schema: public; Owner: root
--

SELECT pg_catalog.setval('public.tasks_id_seq', 51, true);


--
-- Name: users_id_seq; Type: SEQUENCE SET; Schema: public; Owner: root
--

SELECT pg_catalog.setval('public.users_id_seq', 27, true);


--
-- Name: deleted_items deleted_items_pkey; Type: CONSTRAINT; Schema: public; Owner: root
--

ALTER TABLE ONLY public.deleted_items
    ADD CONSTRAINT deleted_items_pkey PRIMARY KEY (id);


--
-- Name: projects projects_pkey; Type: CONSTRAINT; Schema: public; Owner: root
--

ALTER TABLE ONLY public.projects
    ADD CONSTRAINT projects_pkey PRIMARY KEY (id);


--
-- Name: task_evidence task_evidence_pkey; Type: CONSTRAINT; Schema: public; Owner: root
--

ALTER TABLE ONLY public.task_evidence
    ADD CONSTRAINT task_evidence_pkey PRIMARY KEY (id);


--
-- Name: tasks tasks_pkey; Type: CONSTRAINT; Schema: public; Owner: root
--

ALTER TABLE ONLY public.tasks
    ADD CONSTRAINT tasks_pkey PRIMARY KEY (id);


--
-- Name: users users_pkey; Type: CONSTRAINT; Schema: public; Owner: root
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_pkey PRIMARY KEY (id);


--
-- Name: users users_username_key; Type: CONSTRAINT; Schema: public; Owner: root
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_username_key UNIQUE (username);


--
-- Name: deleted_items deleted_items_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: root
--

ALTER TABLE ONLY public.deleted_items
    ADD CONSTRAINT deleted_items_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: projects projects_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: root
--

ALTER TABLE ONLY public.projects
    ADD CONSTRAINT projects_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: task_evidence task_evidence_task_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: root
--

ALTER TABLE ONLY public.task_evidence
    ADD CONSTRAINT task_evidence_task_id_fkey FOREIGN KEY (task_id) REFERENCES public.tasks(id) ON DELETE CASCADE;


--
-- Name: tasks tasks_project_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: root
--

ALTER TABLE ONLY public.tasks
    ADD CONSTRAINT tasks_project_id_fkey FOREIGN KEY (project_id) REFERENCES public.projects(id) ON DELETE CASCADE;


--
-- PostgreSQL database dump complete
--

\unrestrict 9mGRHIEDNNkToWYAvZXpJ7418tc6kj79myfQq2IidDhgdgOZ4tXSf6UrMjX9i58

