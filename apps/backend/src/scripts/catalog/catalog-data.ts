import { SpecAttribute, SpecOption } from "../../modules/catalog/specs"

// The approved Laly category tree, the spec templates per product type, the
// brands, and the add-on groups. setup-catalog.ts applies it idempotently,
// so editing this file and re-running the script is how the structure grows.

export type CategoryDef = {
  handle: string
  name_ar: string
  name_en: string
  description_ar: string
  description_en: string
  children?: CategoryDef[]
}

export const CATEGORY_TREE: CategoryDef[] = [
  {
    handle: "security-cameras",
    name_ar: "كاميرات المراقبة",
    name_en: "Security Cameras",
    description_ar: "كاميرات مراقبة IP وواي فاي وأجهزة تسجيل للبيوت والشركات في الكويت، من Hikvision وVIGI وTapo مع الضمان والتركيب.",
    description_en: "IP and Wi-Fi security cameras and recorders for homes and businesses in Kuwait, from Hikvision, VIGI and Tapo, with warranty and installation.",
    children: [
      {
        handle: "bullet-cameras",
        name_ar: "كاميرات بولت",
        name_en: "Bullet Cameras",
        description_ar: "كاميرات بولت خارجية بمدى رؤية ليلية طويل، مناسبة للأسوار والمداخل ومواقف السيارات.",
        description_en: "Outdoor bullet cameras with long-range night vision for walls, entrances and parking areas.",
      },
      {
        handle: "dome-cameras",
        name_ar: "كاميرات دوم",
        name_en: "Dome Cameras",
        description_ar: "كاميرات دوم داخلية وخارجية بتصميم هادئ ومقاوم للعبث، مثالية للمحلات والمكاتب والممرات.",
        description_en: "Discreet, vandal-resistant dome cameras for shops, offices and corridors, indoors and out.",
      },
      {
        handle: "turret-cameras",
        name_ar: "كاميرات تريت",
        name_en: "Turret Cameras",
        description_ar: "كاميرات تريت (Eyeball) سهلة التوجيه بدون انعكاس للأشعة الليلية، للاستخدام الداخلي والخارجي.",
        description_en: "Easy-to-aim turret (eyeball) cameras with no IR glare, for indoor and outdoor use.",
      },
      {
        handle: "panoramic-cameras",
        name_ar: "كاميرات بانوراما وعين السمكة",
        name_en: "Panoramic & Fisheye Cameras",
        description_ar: "كاميرات بانوراما 180 درجة وعين السمكة 360 درجة تغطي مساحات كبيرة بكاميرا واحدة.",
        description_en: "180° panoramic and 360° fisheye cameras that cover large areas with a single camera.",
      },
      {
        handle: "ptz-cameras",
        name_ar: "كاميرات PTZ متحركة",
        name_en: "PTZ & Pan-Tilt Cameras",
        description_ar: "كاميرات متحركة بالتحكم عن بعد وزووم بصري لمراقبة الساحات والمواقع الكبيرة.",
        description_en: "Remote-controlled pan-tilt-zoom cameras with optical zoom for yards and large sites.",
      },
      {
        handle: "cube-cameras",
        name_ar: "كاميرات مكعب داخلية",
        name_en: "Cube Cameras",
        description_ar: "كاميرات مكعب صغيرة للاستخدام الداخلي في المكاتب والمحلات، بعضها بمايك مدمج.",
        description_en: "Compact indoor cube cameras for offices and shops, some with a built-in microphone.",
      },
      {
        handle: "wifi-cameras",
        name_ar: "كاميرات واي فاي ذكية",
        name_en: "Wi-Fi Smart Cameras",
        description_ar: "كاميرات واي فاي ذكية سهلة التركيب تتابعها من الجوال، مع رؤية ليلية وصوت باتجاهين وتنبيهات فورية.",
        description_en: "Easy-to-install Wi-Fi smart cameras you control from your phone, with night vision, two-way audio and instant alerts.",
      },
      {
        handle: "solar-battery-cameras",
        name_ar: "كاميرات طاقة شمسية وبطارية",
        name_en: "Solar & Battery Cameras",
        description_ar: "كاميرات لاسلكية تعمل بالبطارية أو الطاقة الشمسية للأماكن البعيدة عن الكهرباء.",
        description_en: "Wire-free cameras powered by battery or solar for places without power.",
      },
      {
        handle: "video-recorders",
        name_ar: "أجهزة التسجيل NVR و DVR",
        name_en: "NVR & DVR Recorders",
        description_ar: "أجهزة تسجيل شبكية NVR وDVR بمنافذ PoE لتشغيل الكاميرات وحفظ التسجيلات على الهارد.",
        description_en: "Network and digital video recorders with PoE ports to power cameras and store footage.",
      },
      {
        handle: "video-doorbells",
        name_ar: "أجراس الباب بالفيديو",
        name_en: "Video Doorbells",
        description_ar: "أجراس باب ذكية بالفيديو ترد فيها على الزوار من الجوال أينما كنت.",
        description_en: "Smart video doorbells that let you answer visitors from your phone anywhere.",
      },
    ],
  },
  {
    handle: "access-control-intercom",
    name_ar: "التحكم بالدخول والإنتركم",
    name_en: "Access Control & Intercom",
    description_ar: "أنظمة بصمة الوجه والإصبع والكروت وأجهزة الإنتركم المرئي للفلل والعمارات والشركات.",
    description_en: "Face, fingerprint and card access control and video intercom systems for villas, buildings and offices.",
    children: [
      {
        handle: "access-control",
        name_ar: "أجهزة التحكم بالدخول والبصمة",
        name_en: "Access Control Terminals",
        description_ar: "أجهزة حضور وانصراف وفتح أبواب بالوجه والبصمة والكرت.",
        description_en: "Time attendance and door access terminals using face, fingerprint and cards.",
      },
      {
        handle: "video-intercom",
        name_ar: "الإنتركم المرئي",
        name_en: "Video Intercom",
        description_ar: "أجهزة إنتركم مرئي للأبواب والشاشات الداخلية بأنظمة IP وسلكين.",
        description_en: "Door stations and indoor monitors for IP and 2-wire video intercom systems.",
      },
    ],
  },
  {
    handle: "networking",
    name_ar: "الشبكات والواي فاي",
    name_en: "Networking & Wi-Fi",
    description_ar: "راوترات وأنظمة ميش ومقويات واي فاي وسويتشات لتغطية كاملة وسرعة ثابتة في البيت والشركة.",
    description_en: "Routers, mesh systems, Wi-Fi extenders and switches for full coverage and stable speed at home and work.",
    children: [
      {
        handle: "wifi-routers",
        name_ar: "راوترات واي فاي",
        name_en: "Wi-Fi Routers",
        description_ar: "راوترات واي فاي 6 و7 لخطوط الفايبر، بما فيها راوترات الألعاب.",
        description_en: "Wi-Fi 6 and Wi-Fi 7 routers for fibre lines, including gaming routers.",
      },
      {
        handle: "mesh-wifi",
        name_ar: "أنظمة الواي فاي ميش",
        name_en: "Mesh Wi-Fi Systems",
        description_ar: "أنظمة ميش Deco وHalo تغطي البيت كامل بشبكة واحدة بدون انقطاع بين الغرف والأدوار.",
        description_en: "Deco and Halo mesh systems that cover the whole home with one seamless network across rooms and floors.",
      },
      {
        handle: "mobile-routers",
        name_ar: "راوترات 4G و5G",
        name_en: "4G & 5G Routers",
        description_ar: "راوترات وماي فاي بشريحة 4G و5G تعمل مع شبكات زين وSTC وأوريدو.",
        description_en: "SIM-based 4G and 5G routers and mobile Wi-Fi that work with Zain, stc and Ooredoo.",
      },
      {
        handle: "range-extenders",
        name_ar: "مقويات الواي فاي",
        name_en: "Wi-Fi Range Extenders",
        description_ar: "مقويات واي فاي توصل الشبكة للغرف البعيدة والأدوار العلوية.",
        description_en: "Wi-Fi extenders that carry the network to far rooms and upper floors.",
      },
      {
        handle: "switches",
        name_ar: "سويتشات الشبكة",
        name_en: "Network Switches",
        description_ar: "سويتشات جيجابت و2.5G و10G، منها PoE لتشغيل الكاميرات ونقاط الوصول.",
        description_en: "Gigabit, 2.5G and 10G switches, including PoE models to power cameras and access points.",
      },
      {
        handle: "access-points",
        name_ar: "أكسس بوينت",
        name_en: "Access Points",
        description_ar: "نقاط وصول سقفية وجدارية وخارجية للشركات والفنادق والفلل الكبيرة.",
        description_en: "Ceiling, wall-plate and outdoor access points for offices, hotels and large villas.",
      },
      {
        handle: "network-adapters",
        name_ar: "كروت ومحولات الشبكة",
        name_en: "Network Adapters",
        description_ar: "محولات واي فاي USB وكروت PCIe ومحولات إيثرنت وبلوتوث للكمبيوتر.",
        description_en: "USB Wi-Fi adapters, PCIe cards, Ethernet and Bluetooth adapters for PCs.",
      },
    ],
  },
  {
    handle: "computers",
    name_ar: "الكمبيوتر واللابتوب",
    name_en: "Computers & Laptops",
    description_ar: "لابتوبات وأجهزة كمبيوتر مكتبية وشاشات وإكسسوارات، مع إمكانية ترقية الرام والتخزين عند الطلب.",
    description_en: "Laptops, desktop PCs, monitors and accessories, with RAM and storage upgrades on order.",
    children: [
      {
        handle: "laptops",
        name_ar: "لابتوبات",
        name_en: "Laptops",
        description_ar: "لابتوبات للدراسة والعمل والألعاب مع خيارات ترقية الرام وSSD.",
        description_en: "Laptops for study, work and gaming with RAM and SSD upgrade options.",
      },
      {
        handle: "desktops",
        name_ar: "أجهزة كمبيوتر مكتبية",
        name_en: "Desktop PCs",
        description_ar: "أجهزة كمبيوتر مكتبية وميني وأول إن ون، قابلة للترقية حسب احتياجك.",
        description_en: "Tower, mini and all-in-one desktop PCs, upgradeable to your needs.",
      },
      {
        handle: "monitors",
        name_ar: "شاشات كمبيوتر",
        name_en: "Monitors",
        description_ar: "شاشات للعمل والألعاب بدقة FHD و2K و4K ومعدلات تحديث عالية.",
        description_en: "Work and gaming monitors in FHD, QHD and 4K with high refresh rates.",
      },
      {
        handle: "computer-accessories",
        name_ar: "إكسسوارات الكمبيوتر",
        name_en: "Computer Accessories",
        description_ar: "موزعات USB-C ومحولات HDMI وإكسسوارات توصيل للابتوب والكمبيوتر.",
        description_en: "USB-C hubs, HDMI adapters and connectivity accessories for laptops and PCs.",
      },
    ],
  },
  {
    handle: "storage",
    name_ar: "التخزين",
    name_en: "Storage",
    description_ar: "هاردات مراقبة وكمبيوتر وأقراص SSD وكروت ذاكرة للكاميرات والجوالات.",
    description_en: "Surveillance and desktop hard drives, SSDs and memory cards for cameras and phones.",
    children: [
      {
        handle: "hard-drives",
        name_ar: "هاردات داخلية",
        name_en: "Internal Hard Drives",
        description_ar: "هاردات مراقبة مخصصة للتسجيل المستمر 24/7 وهاردات للكمبيوتر وNAS.",
        description_en: "Surveillance drives built for 24/7 recording, plus desktop and NAS drives.",
      },
      {
        handle: "ssd",
        name_ar: "أقراص SSD",
        name_en: "SSD Drives",
        description_ar: "أقراص SSD بنوعي SATA وNVMe لتسريع اللابتوب والكمبيوتر.",
        description_en: "SATA and NVMe SSDs to speed up laptops and PCs.",
      },
      {
        handle: "memory-cards",
        name_ar: "كروت الذاكرة",
        name_en: "Memory Cards",
        description_ar: "كروت microSD مناسبة لكاميرات الواي فاي والجوالات وكاميرات الأكشن.",
        description_en: "microSD cards for Wi-Fi cameras, phones and action cameras.",
      },
    ],
  },
  {
    handle: "smart-home",
    name_ar: "البيت الذكي",
    name_en: "Smart Home",
    description_ar: "حساسات ومقابس ومفاتيح وإضاءة ذكية تتحكم فيها من الجوال وتعمل مع أليكسا وجوجل.",
    description_en: "Smart sensors, plugs, switches and lighting you control from your phone, working with Alexa and Google.",
    children: [
      {
        handle: "smart-sensors",
        name_ar: "حساسات ذكية وهب",
        name_en: "Smart Sensors & Hubs",
        description_ar: "حساسات حركة وأبواب وتسريب ماء وحرارة مع الهب الذي يربطها.",
        description_en: "Motion, door, water-leak and temperature sensors with the hub that connects them.",
      },
      {
        handle: "smart-plugs-switches",
        name_ar: "مقابس ومفاتيح ذكية",
        name_en: "Smart Plugs & Switches",
        description_ar: "مقابس ومشتركات ومفاتيح إنارة ذكية بجدولة وتحكم عن بعد.",
        description_en: "Smart plugs, power strips and light switches with schedules and remote control.",
      },
      {
        handle: "smart-lighting",
        name_ar: "إضاءة ذكية",
        name_en: "Smart Lighting",
        description_ar: "لمبات وشرائط إضاءة ذكية بملايين الألوان والتحكم الصوتي.",
        description_en: "Smart bulbs and light strips with millions of colours and voice control.",
      },
    ],
  },
  {
    handle: "security-software",
    name_ar: "برامج الحماية",
    name_en: "Security Software",
    description_ar: "برامج حماية من الفيروسات Kaspersky وNorton بتراخيص أصلية لأجهزة ويندوز وماك والجوال.",
    description_en: "Genuine Kaspersky and Norton antivirus licences for Windows, Mac and mobile.",
  },
]

const o = (value: string, label_ar: string, label_en = label_ar): SpecOption => ({ value, label_ar, label_en })
type A = Omit<SpecAttribute, "key" | "label_ar" | "label_en" | "type">
const field = (
  key: string,
  label_ar: string,
  label_en: string,
  type: SpecAttribute["type"],
  rest: A = {}
): SpecAttribute => ({ key, label_ar, label_en, type, ...rest })

const G = {
  image: { group_ar: "الصورة والعدسة", group_en: "Image & lens" },
  night: { group_ar: "الرؤية الليلية", group_en: "Night vision" },
  smart: { group_ar: "الذكاء الاصطناعي", group_en: "Smart features" },
  conn: { group_ar: "الاتصال والطاقة", group_en: "Connectivity & power" },
  build: { group_ar: "التصميم والحماية", group_en: "Build & protection" },
  storage: { group_ar: "التخزين", group_en: "Storage" },
  wifi: { group_ar: "الواي فاي", group_en: "Wi-Fi" },
  ports: { group_ar: "المنافذ", group_en: "Ports" },
  perf: { group_ar: "الأداء", group_en: "Performance" },
  display: { group_ar: "الشاشة", group_en: "Display" },
  general: { group_ar: "عام", group_en: "General" },
}

const WIFI_STANDARDS = [
  o("wifi4", "واي فاي 4 (N)", "Wi-Fi 4 (N)"),
  o("wifi5", "واي فاي 5 (AC)", "Wi-Fi 5 (AC)"),
  o("wifi6", "واي فاي 6 (AX)", "Wi-Fi 6 (AX)"),
  o("wifi6e", "واي فاي 6E", "Wi-Fi 6E"),
  o("wifi7", "واي فاي 7 (BE)", "Wi-Fi 7 (BE)"),
]
const PORT_SPEEDS = [
  o("100m", "100 ميجا", "10/100 Mbps"),
  o("1g", "جيجابت", "Gigabit"),
  o("2_5g", "2.5 جيجابت", "2.5 Gigabit"),
  o("10g", "10 جيجابت", "10 Gigabit"),
]
const yesNo = (key: string, ar: string, en: string, group: object, filterable = false) =>
  field(key, ar, en, "boolean", { ...group, filterable })

export type TemplateDef = {
  name_ar: string
  name_en: string
  categories: string[]
  attributes: SpecAttribute[]
}

export const SPEC_TEMPLATES: TemplateDef[] = [
  {
    name_ar: "كاميرات IP",
    name_en: "IP cameras",
    categories: ["bullet-cameras", "dome-cameras", "turret-cameras", "panoramic-cameras", "ptz-cameras", "cube-cameras"],
    attributes: [
      field("resolution_mp", "الدقة", "Resolution", "number", { unit: "MP", filterable: true, ...G.image }),
      field("form_factor", "شكل الكاميرا", "Form factor", "select", {
        filterable: true,
        ...G.image,
        options: [
          o("bullet", "بولت", "Bullet"),
          o("dome", "دوم", "Dome"),
          o("turret", "تريت", "Turret"),
          o("ptz", "PTZ متحركة", "PTZ"),
          o("panoramic", "بانوراما", "Panoramic"),
          o("fisheye", "عين السمكة", "Fisheye"),
          o("cube", "مكعب", "Cube"),
        ],
      }),
      field("lens_type", "نوع العدسة", "Lens type", "select", {
        filterable: true,
        ...G.image,
        options: [
          o("fixed", "ثابتة", "Fixed"),
          o("varifocal_motorized", "متغيرة بمحرك (زووم)", "Motorized varifocal"),
          o("varifocal_manual", "متغيرة يدوية", "Manual varifocal"),
        ],
      }),
      field("focal_length", "البعد البؤري", "Focal length", "text", { ...G.image }),
      field("optical_zoom", "الزووم البصري", "Optical zoom", "number", { unit: "x", ...G.image }),
      field("field_of_view", "زاوية الرؤية الأفقية", "Horizontal field of view", "text", { ...G.image }),
      field("wdr_db", "WDR", "WDR", "number", { unit: "dB", ...G.image }),
      field("night_technologies", "تقنية الرؤية الليلية", "Night vision technology", "multiselect", {
        filterable: true,
        ...G.night,
        options: [
          o("colorvu", "ملونة ليلًا ColorVu", "ColorVu (colour at night)"),
          o("smart_hybrid", "إضاءة هجينة ذكية", "Smart Hybrid Light"),
          o("darkfighter", "Darkfighter للإضاءة المنخفضة", "DarkFighter low light"),
          o("ir", "أشعة تحت الحمراء IR", "Infrared (IR)"),
        ],
      }),
      field("night_range_m", "مدى الرؤية الليلية", "Night vision range", "number", { unit: "m", ...G.night }),
      field("ai_features", "التحليل الذكي", "AI analytics", "multiselect", {
        filterable: true,
        ...G.smart,
        options: [
          o("human_vehicle", "تمييز الإنسان والمركبة AcuSense", "Human & vehicle (AcuSense)"),
          o("perimeter", "حماية المحيط (عبور الخط ودخول المنطقة)", "Perimeter protection"),
          o("face", "التقاط الوجوه", "Face capture"),
          o("people_counting", "عدّ الأشخاص", "People counting"),
          o("auto_tracking", "تتبع تلقائي", "Auto tracking"),
        ],
      }),
      field("audio", "الصوت", "Audio", "select", {
        filterable: true,
        ...G.smart,
        options: [
          o("none", "بدون", "None"),
          o("mic", "مايك مدمج", "Built-in mic"),
          o("two_way", "صوت باتجاهين", "Two-way audio"),
        ],
      }),
      yesNo("active_deterrence", "ضوء تحذيري وإنذار صوتي", "Strobe light & audible warning", G.smart, true),
      field("power", "الطاقة", "Power", "multiselect", {
        filterable: true,
        ...G.conn,
        options: [o("poe", "PoE عبر كيبل الشبكة", "PoE"), o("12v_dc", "12V DC", "12 V DC"), o("24v_ac", "24V AC", "24 V AC")],
      }),
      field("video_compression", "ضغط الفيديو", "Video compression", "text", { ...G.conn }),
      field("onboard_storage", "التخزين الداخلي", "On-board storage", "text", { ...G.storage }),
      field("protection", "الحماية من الماء والغبار", "Ingress protection", "text", { ...G.build }),
      yesNo("vandal_proof", "مقاومة التخريب IK10", "Vandal-proof (IK10)", G.build),
      field("operating_temperature", "حرارة التشغيل", "Operating temperature", "text", { ...G.build }),
    ],
  },
  {
    name_ar: "كاميرات واي فاي",
    name_en: "Wi-Fi cameras",
    categories: ["wifi-cameras", "solar-battery-cameras", "video-doorbells"],
    attributes: [
      field("resolution_mp", "الدقة", "Resolution", "number", { unit: "MP", filterable: true, ...G.image }),
      field("video_resolution", "دقة الفيديو", "Video resolution", "text", { ...G.image }),
      yesNo("pan_tilt", "دوران أفقي وعمودي", "Pan & tilt", G.image, true),
      yesNo("dual_lens", "عدستين", "Dual lens", G.image, true),
      field("placement", "مكان الاستخدام", "Placement", "select", {
        filterable: true,
        ...G.build,
        options: [o("indoor", "داخلي", "Indoor"), o("outdoor", "خارجي", "Outdoor"), o("both", "داخلي وخارجي", "Indoor & outdoor")],
      }),
      field("power_source", "مصدر الطاقة", "Power source", "multiselect", {
        filterable: true,
        ...G.conn,
        options: [
          o("plug", "كهرباء", "Mains adapter"),
          o("battery", "بطارية", "Battery"),
          o("solar", "طاقة شمسية", "Solar"),
          o("poe", "PoE", "PoE"),
        ],
      }),
      field("connectivity", "الاتصال", "Connectivity", "multiselect", {
        filterable: true,
        ...G.conn,
        options: [
          o("wifi_2_4", "واي فاي 2.4GHz", "2.4 GHz Wi-Fi"),
          o("wifi_dual", "واي فاي ثنائي النطاق", "Dual-band Wi-Fi"),
          o("ethernet", "كيبل شبكة", "Ethernet"),
          o("4g", "شريحة 4G", "4G SIM"),
        ],
      }),
      field("night_vision", "الرؤية الليلية", "Night vision", "multiselect", {
        filterable: true,
        ...G.night,
        options: [o("ir", "أبيض وأسود IR", "IR black & white"), o("color", "ملونة", "Full colour")],
      }),
      field("night_range_m", "مدى الرؤية الليلية", "Night vision range", "number", { unit: "m", ...G.night }),
      field("smart_detection", "الكشف الذكي", "Smart detection", "multiselect", {
        filterable: true,
        ...G.smart,
        options: [
          o("person", "الأشخاص", "Person"),
          o("vehicle", "المركبات", "Vehicle"),
          o("pet", "الحيوانات الأليفة", "Pet"),
          o("baby_cry", "بكاء الطفل", "Baby crying"),
          o("package", "الطرود", "Package"),
        ],
      }),
      yesNo("two_way_audio", "صوت باتجاهين", "Two-way audio", G.smart, true),
      yesNo("siren", "سرينة إنذار", "Siren", G.smart),
      field("storage_options", "التخزين", "Storage", "multiselect", {
        ...G.storage,
        options: [o("microsd", "كارت microSD", "microSD card"), o("cloud", "سحابي", "Cloud"), o("hub", "هب", "Hub / base station")],
      }),
      field("max_microsd_gb", "أقصى سعة microSD", "Max microSD", "number", { unit: "GB", ...G.storage }),
      field("protection", "الحماية من الماء والغبار", "Ingress protection", "text", { ...G.build }),
      field("battery", "البطارية", "Battery", "text", { ...G.conn }),
    ],
  },
  {
    name_ar: "أجهزة التسجيل",
    name_en: "Video recorders",
    categories: ["video-recorders"],
    attributes: [
      field("recorder_type", "نوع الجهاز", "Recorder type", "select", {
        filterable: true,
        ...G.general,
        options: [o("nvr", "NVR شبكي", "NVR"), o("dvr", "DVR", "DVR"), o("hybrid", "هجين", "Hybrid")],
      }),
      field("channels", "عدد القنوات", "Channels", "number", { filterable: true, ...G.general }),
      field("poe_ports", "منافذ PoE", "PoE ports", "number", { filterable: true, ...G.conn }),
      field("max_resolution_mp", "أعلى دقة تسجيل", "Max recording resolution", "number", { unit: "MP", ...G.perf }),
      field("incoming_bandwidth_mbps", "عرض النطاق الوارد", "Incoming bandwidth", "number", { unit: "Mbps", ...G.perf }),
      field("hdd_bays", "عدد الهاردات", "HDD bays", "number", { filterable: true, ...G.storage }),
      field("max_hdd_tb", "أقصى سعة لكل هارد", "Max capacity per HDD", "number", { unit: "TB", ...G.storage }),
      field("video_outputs", "مخارج الفيديو", "Video outputs", "text", { ...G.ports }),
      field("ai_features", "التحليل الذكي", "AI features", "text", { ...G.perf }),
    ],
  },
  {
    name_ar: "الواي فاي والراوترات",
    name_en: "Wi-Fi & routers",
    categories: ["wifi-routers", "mesh-wifi", "mobile-routers", "range-extenders", "access-points"],
    attributes: [
      field("wifi_standard", "جيل الواي فاي", "Wi-Fi standard", "select", { filterable: true, ...G.wifi, options: WIFI_STANDARDS }),
      field("speed_class", "فئة السرعة", "Speed class", "text", { ...G.wifi }),
      field("bands", "الترددات", "Bands", "select", {
        filterable: true,
        ...G.wifi,
        options: [o("single", "تردد واحد", "Single-band"), o("dual", "ثنائي التردد", "Dual-band"), o("tri", "ثلاثي التردد", "Tri-band"), o("quad", "رباعي التردد", "Quad-band")],
      }),
      field("max_speed_mbps", "أقصى سرعة واي فاي", "Max Wi-Fi speed", "number", { unit: "Mbps", ...G.wifi }),
      field("internet_connection", "نوع الإنترنت", "Internet connection", "multiselect", {
        filterable: true,
        ...G.conn,
        options: [
          o("fiber", "فايبر / كيبل", "Fibre / Ethernet WAN"),
          o("4g", "شريحة 4G", "4G SIM"),
          o("5g", "شريحة 5G", "5G SIM"),
          o("dsl", "ADSL / VDSL", "ADSL / VDSL"),
        ],
      }),
      field("wan_speed", "سرعة منفذ الإنترنت", "WAN port speed", "select", { filterable: true, ...G.ports, options: PORT_SPEEDS }),
      field("lan_ports", "منافذ LAN", "LAN ports", "number", { ...G.ports }),
      field("mesh", "دعم الميش", "Mesh support", "multiselect", {
        filterable: true,
        ...G.wifi,
        options: [o("easymesh", "EasyMesh", "EasyMesh"), o("onemesh", "OneMesh", "OneMesh"), o("deco", "Deco Mesh", "Deco Mesh"), o("omada", "Omada Mesh", "Omada Mesh")],
      }),
      field("coverage_sqm", "التغطية", "Coverage", "number", { unit: "m²", ...G.wifi }),
      field("max_devices", "عدد الأجهزة", "Connected devices", "number", { ...G.wifi }),
      field("mounting", "التركيب", "Mounting", "select", {
        filterable: true,
        ...G.build,
        options: [o("desktop", "مكتبي", "Desktop"), o("ceiling", "سقفي", "Ceiling"), o("wall", "جداري", "Wall plate"), o("outdoor", "خارجي", "Outdoor"), o("plug", "على الفيش", "Wall plug")],
      }),
      yesNo("gaming", "مخصص للألعاب", "Gaming", G.perf, true),
      yesNo("poe_powered", "يعمل بـ PoE", "PoE powered", G.conn),
      yesNo("vpn", "VPN مدمج", "Built-in VPN", G.perf),
      field("usb_ports", "منافذ USB", "USB ports", "text", { ...G.ports }),
    ],
  },
  {
    name_ar: "السويتشات",
    name_en: "Switches",
    categories: ["switches"],
    attributes: [
      field("ports_total", "عدد المنافذ", "Ports", "number", { filterable: true, ...G.ports }),
      field("port_speed", "سرعة المنافذ", "Port speed", "select", { filterable: true, ...G.ports, options: PORT_SPEEDS }),
      field("poe_ports", "منافذ PoE", "PoE ports", "number", { filterable: true, ...G.conn }),
      field("poe_budget_w", "طاقة PoE الكلية", "PoE budget", "number", { unit: "W", ...G.conn }),
      field("sfp_ports", "منافذ SFP", "SFP ports", "number", { ...G.ports }),
      field("management", "الإدارة", "Management", "select", {
        filterable: true,
        ...G.general,
        options: [
          o("unmanaged", "غير مُدار", "Unmanaged"),
          o("easy_smart", "Easy Smart", "Easy Smart"),
          o("smart", "مُدار ذكي", "Smart managed"),
          o("l2", "مُدار L2/L2+", "L2/L2+ managed"),
          o("l3", "مُدار L3", "L3 managed"),
        ],
      }),
      field("form_factor", "الشكل", "Form factor", "select", {
        filterable: true,
        ...G.build,
        options: [o("desktop", "مكتبي", "Desktop"), o("rackmount", "راك", "Rackmount"), o("desktop_rackmount", "مكتبي / راك", "Desktop / rackmount")],
      }),
      field("housing", "الهيكل", "Housing", "select", { ...G.build, options: [o("metal", "معدن", "Metal"), o("plastic", "بلاستيك", "Plastic")] }),
    ],
  },
  {
    name_ar: "محولات الشبكة",
    name_en: "Network adapters",
    categories: ["network-adapters"],
    attributes: [
      field("interface", "الواجهة", "Interface", "select", {
        filterable: true,
        ...G.ports,
        options: [o("usb2", "USB 2.0"), o("usb3", "USB 3.0"), o("usb_c", "USB-C"), o("pcie", "PCIe")],
      }),
      field("wifi_standard", "جيل الواي فاي", "Wi-Fi standard", "select", { filterable: true, ...G.wifi, options: WIFI_STANDARDS }),
      field("max_speed_mbps", "أقصى سرعة", "Max speed", "number", { unit: "Mbps", ...G.perf }),
      field("ethernet_speed", "سرعة الإيثرنت", "Ethernet speed", "select", { ...G.ports, options: PORT_SPEEDS }),
      field("bluetooth", "البلوتوث", "Bluetooth", "select", {
        filterable: true,
        ...G.conn,
        options: [o("none", "بدون", "None"), o("4.2", "4.2"), o("5.0", "5.0"), o("5.2", "5.2"), o("5.3", "5.3"), o("5.4", "5.4")],
      }),
      field("antenna", "الهوائي", "Antenna", "select", {
        ...G.wifi,
        options: [o("internal", "داخلي (نانو)", "Internal (nano)"), o("external", "خارجي", "External"), o("high_gain", "عالي الكسب", "High gain")],
      }),
      field("os_support", "أنظمة التشغيل", "OS support", "text", { ...G.general }),
    ],
  },
  {
    name_ar: "اللابتوب والكمبيوتر",
    name_en: "Laptops & desktops",
    categories: ["laptops", "desktops"],
    attributes: [
      field("cpu_brand", "المعالج", "Processor brand", "select", {
        filterable: true,
        ...G.perf,
        options: [o("intel", "Intel"), o("amd", "AMD"), o("apple", "Apple"), o("qualcomm", "Qualcomm")],
      }),
      field("cpu_model", "موديل المعالج", "Processor model", "text", { ...G.perf }),
      field("ram_gb", "الرام", "RAM", "number", { unit: "GB", filterable: true, ...G.perf }),
      field("ram_type", "نوع الرام", "RAM type", "select", { ...G.perf, options: [o("ddr4", "DDR4"), o("ddr5", "DDR5"), o("lpddr5", "LPDDR5"), o("lpddr5x", "LPDDR5X")] }),
      field("ram_max_gb", "أقصى رام ممكن", "Max RAM", "number", { unit: "GB", ...G.perf }),
      field("storage_gb", "التخزين", "Storage", "number", { unit: "GB", filterable: true, ...G.storage }),
      field("storage_type", "نوع التخزين", "Storage type", "select", {
        filterable: true,
        ...G.storage,
        options: [o("ssd", "SSD"), o("hdd", "HDD"), o("ssd_hdd", "SSD + HDD")],
      }),
      field("free_storage_slots", "منافذ تخزين إضافية", "Free storage slots", "text", { ...G.storage }),
      field("gpu", "كرت الشاشة", "Graphics", "text", { ...G.perf }),
      field("gpu_type", "نوع كرت الشاشة", "Graphics type", "select", {
        filterable: true,
        ...G.perf,
        options: [o("integrated", "مدمج", "Integrated"), o("dedicated", "منفصل", "Dedicated")],
      }),
      field("screen_size_in", "حجم الشاشة", "Screen size", "number", { unit: "inch", filterable: true, ...G.display }),
      field("screen_resolution", "دقة الشاشة", "Screen resolution", "text", { ...G.display }),
      field("refresh_rate_hz", "معدل التحديث", "Refresh rate", "number", { unit: "Hz", ...G.display }),
      field("os", "نظام التشغيل", "Operating system", "select", {
        filterable: true,
        ...G.general,
        options: [
          o("win11_home", "Windows 11 Home"),
          o("win11_pro", "Windows 11 Pro"),
          o("macos", "macOS"),
          o("no_os", "بدون نظام", "No OS"),
        ],
      }),
      field("keyboard", "لغة الكيبورد", "Keyboard", "select", { ...G.general, options: [o("ar_en", "عربي / إنجليزي", "Arabic / English"), o("en", "إنجليزي", "English")] }),
      field("ports", "المنافذ", "Ports", "text", { ...G.ports }),
      field("weight_kg", "الوزن", "Weight", "number", { unit: "kg", ...G.build }),
      field("battery", "البطارية", "Battery", "text", { ...G.general }),
    ],
  },
  {
    name_ar: "الشاشات",
    name_en: "Monitors",
    categories: ["monitors"],
    attributes: [
      field("screen_size_in", "حجم الشاشة", "Screen size", "number", { unit: "inch", filterable: true, ...G.display }),
      field("resolution", "الدقة", "Resolution", "select", {
        filterable: true,
        ...G.display,
        options: [o("fhd", "FHD 1080p"), o("qhd", "QHD 1440p (2K)"), o("uhd", "UHD 4K"), o("5k", "5K")],
      }),
      field("refresh_rate_hz", "معدل التحديث", "Refresh rate", "number", { unit: "Hz", filterable: true, ...G.display }),
      field("panel", "نوع اللوحة", "Panel", "select", {
        filterable: true,
        ...G.display,
        options: [o("ips", "IPS"), o("va", "VA"), o("tn", "TN"), o("oled", "OLED")],
      }),
      field("response_ms", "زمن الاستجابة", "Response time", "number", { unit: "ms", ...G.display }),
      yesNo("curved", "شاشة منحنية", "Curved", G.display, true),
      field("inputs", "المداخل", "Inputs", "multiselect", {
        filterable: true,
        ...G.ports,
        options: [o("hdmi", "HDMI"), o("dp", "DisplayPort"), o("usb_c", "USB-C"), o("vga", "VGA")],
      }),
      yesNo("speakers", "سماعات مدمجة", "Built-in speakers", G.general),
      yesNo("height_adjustable", "قاعدة قابلة لتعديل الارتفاع", "Height-adjustable stand", G.build),
      yesNo("vesa", "تعليق VESA", "VESA mount", G.build),
    ],
  },
  {
    name_ar: "التخزين",
    name_en: "Storage",
    categories: ["hard-drives", "ssd", "memory-cards"],
    attributes: [
      field("capacity", "السعة", "Capacity", "select", {
        filterable: true,
        ...G.storage,
        options: ["32GB", "64GB", "128GB", "256GB", "512GB", "1TB", "2TB", "4TB", "6TB", "8TB", "10TB", "12TB", "16TB", "20TB"].map((c) =>
          o(c.toLowerCase(), c.replace("GB", " جيجا").replace("TB", " تيرا"), c.replace("GB", " GB").replace("TB", " TB"))
        ),
      }),
      field("drive_type", "النوع", "Type", "select", {
        filterable: true,
        ...G.storage,
        options: [o("hdd", "هارد HDD", "HDD"), o("ssd", "SSD"), o("microsd", "microSD"), o("usb_flash", "فلاش USB", "USB flash")],
      }),
      field("usage", "الاستخدام", "Designed for", "select", {
        filterable: true,
        ...G.general,
        options: [
          o("surveillance", "المراقبة 24/7", "Surveillance 24/7"),
          o("nas", "NAS", "NAS"),
          o("desktop", "كمبيوتر مكتبي", "Desktop"),
          o("laptop", "لابتوب", "Laptop"),
          o("camera", "كاميرات وجوالات", "Cameras & phones"),
        ],
      }),
      field("interface", "الواجهة", "Interface", "select", {
        filterable: true,
        ...G.ports,
        options: [o("sata", "SATA"), o("nvme3", "NVMe PCIe 3.0"), o("nvme4", "NVMe PCIe 4.0"), o("nvme5", "NVMe PCIe 5.0"), o("usb", "USB")],
      }),
      field("form_factor", "المقاس", "Form factor", "select", {
        ...G.build,
        options: [o("3_5", "3.5 إنش", "3.5-inch"), o("2_5", "2.5 إنش", "2.5-inch"), o("m2_2280", "M.2 2280"), o("microsd", "microSD")],
      }),
      field("read_speed_mbs", "سرعة القراءة", "Read speed", "number", { unit: "MB/s", ...G.perf }),
      field("write_speed_mbs", "سرعة الكتابة", "Write speed", "number", { unit: "MB/s", ...G.perf }),
      field("rpm", "سرعة الدوران", "Spindle speed", "number", { unit: "RPM", ...G.perf }),
      field("speed_class", "فئة السرعة", "Speed class", "text", { ...G.perf }),
      field("workload_tb_year", "عبء العمل السنوي", "Workload rate", "number", { unit: "TB/year", ...G.perf }),
    ],
  },
  {
    name_ar: "التحكم بالدخول والإنتركم",
    name_en: "Access control & intercom",
    categories: ["access-control", "video-intercom"],
    attributes: [
      field("device_type", "نوع الجهاز", "Device type", "select", {
        filterable: true,
        ...G.general,
        options: [
          o("face_terminal", "جهاز بصمة وجه", "Face recognition terminal"),
          o("fingerprint_terminal", "جهاز بصمة إصبع", "Fingerprint terminal"),
          o("card_reader", "قارئ كروت", "Card reader"),
          o("controller", "كنترولر", "Access controller"),
          o("door_station", "وحدة باب", "Door station"),
          o("indoor_station", "شاشة داخلية", "Indoor station"),
          o("kit", "طقم كامل", "Complete kit"),
        ],
      }),
      field("auth_methods", "طرق التحقق", "Authentication", "multiselect", {
        filterable: true,
        ...G.smart,
        options: [o("face", "الوجه", "Face"), o("fingerprint", "البصمة", "Fingerprint"), o("card", "الكرت", "Card"), o("pin", "الرقم السري", "PIN"), o("qr", "QR", "QR code")],
      }),
      field("wiring", "نظام التوصيل", "Wiring", "select", {
        filterable: true,
        ...G.conn,
        options: [o("ip", "IP شبكي", "IP"), o("2_wire", "سلكين", "2-wire"), o("4_wire", "4 أسلاك", "4-wire")],
      }),
      field("screen_size_in", "حجم الشاشة", "Screen size", "number", { unit: "inch", ...G.display }),
      field("face_capacity", "سعة الوجوه", "Face capacity", "number", { ...G.storage }),
      field("card_capacity", "سعة الكروت", "Card capacity", "number", { ...G.storage }),
      yesNo("poe", "يعمل بـ PoE", "PoE powered", G.conn),
      field("protection", "الحماية", "Protection", "text", { ...G.build }),
    ],
  },
  {
    name_ar: "البيت الذكي",
    name_en: "Smart home",
    categories: ["smart-sensors", "smart-plugs-switches", "smart-lighting"],
    attributes: [
      field("device_type", "نوع الجهاز", "Device type", "select", {
        filterable: true,
        ...G.general,
        options: [
          o("motion_sensor", "حساس حركة", "Motion sensor"),
          o("contact_sensor", "حساس باب وشباك", "Contact sensor"),
          o("temp_humidity", "حساس حرارة ورطوبة", "Temperature & humidity"),
          o("water_leak", "حساس تسريب ماء", "Water leak sensor"),
          o("button", "زر ذكي", "Smart button"),
          o("hub", "هب", "Hub"),
          o("plug", "مقبس ذكي", "Smart plug"),
          o("power_strip", "مشترك ذكي", "Power strip"),
          o("light_switch", "مفتاح إنارة", "Light switch"),
          o("dimmer", "ديمر", "Dimmer"),
          o("bulb", "لمبة", "Bulb"),
          o("light_strip", "شريط إضاءة", "Light strip"),
          o("spotlight", "سبوت لايت", "Spotlight"),
        ],
      }),
      field("works_with", "يعمل مع", "Works with", "multiselect", {
        filterable: true,
        ...G.conn,
        options: [o("alexa", "Amazon Alexa"), o("google", "Google Home"), o("apple_home", "Apple Home"), o("matter", "Matter"), o("smartthings", "SmartThings")],
      }),
      field("connectivity", "الاتصال", "Connectivity", "select", {
        filterable: true,
        ...G.conn,
        options: [o("wifi", "واي فاي", "Wi-Fi"), o("sub_ghz", "عبر الهب (Sub-GHz)", "Hub (Sub-GHz)"), o("zigbee", "Zigbee"), o("bluetooth", "بلوتوث", "Bluetooth"), o("thread", "Thread")],
      }),
      yesNo("requires_hub", "يحتاج هب", "Requires hub", G.conn, true),
      yesNo("energy_monitoring", "قياس استهلاك الكهرباء", "Energy monitoring", G.smart),
      field("max_load_w", "أقصى حمل", "Max load", "number", { unit: "W", ...G.perf }),
      field("light_color", "لون الإضاءة", "Light colour", "select", {
        ...G.general,
        options: [o("white", "أبيض", "White"), o("tunable", "أبيض قابل للتعديل", "Tunable white"), o("multicolor", "ملون", "Multicolour")],
      }),
      field("brightness_lm", "شدة الإضاءة", "Brightness", "number", { unit: "lm", ...G.perf }),
      field("battery", "البطارية", "Battery", "text", { ...G.general }),
    ],
  },
  {
    name_ar: "إكسسوارات الكمبيوتر",
    name_en: "Computer accessories",
    categories: ["computer-accessories"],
    attributes: [
      field("connector", "التوصيل", "Connector", "select", { filterable: true, ...G.ports, options: [o("usb_a", "USB-A"), o("usb_c", "USB-C")] }),
      field("ports_count", "عدد المنافذ", "Number of ports", "number", { ...G.ports }),
      field("ports", "المنافذ", "Ports", "multiselect", {
        filterable: true,
        ...G.ports,
        options: [o("hdmi", "HDMI"), o("usb_a", "USB-A"), o("usb_c", "USB-C"), o("ethernet", "إيثرنت", "Ethernet"), o("sd", "قارئ SD", "SD reader"), o("pd", "شحن PD", "PD charging")],
      }),
      field("max_video", "أعلى دقة عرض", "Max video output", "text", { ...G.display }),
      field("pd_watts", "شحن PD", "PD pass-through", "number", { unit: "W", ...G.conn }),
    ],
  },
  {
    name_ar: "برامج الحماية",
    name_en: "Security software",
    categories: ["security-software"],
    attributes: [
      field("devices", "عدد الأجهزة", "Devices", "number", { filterable: true, ...G.general }),
      field("duration_months", "مدة الاشتراك", "Subscription", "number", { unit: "months", filterable: true, ...G.general }),
      field("platforms", "الأنظمة", "Platforms", "multiselect", {
        filterable: true,
        ...G.general,
        options: [o("windows", "Windows"), o("mac", "macOS"), o("android", "Android"), o("ios", "iOS")],
      }),
      field("features", "المزايا", "Features", "multiselect", {
        filterable: true,
        ...G.smart,
        options: [
          o("antivirus", "حماية من الفيروسات", "Antivirus"),
          o("vpn", "VPN"),
          o("password_manager", "مدير كلمات المرور", "Password manager"),
          o("parental", "رقابة أبوية", "Parental control"),
          o("identity", "حماية الهوية", "Identity protection"),
        ],
      }),
      field("delivery", "طريقة التسليم", "Delivery", "select", { ...G.general, options: [o("card", "كرت", "Card"), o("digital", "كود رقمي", "Digital code")] }),
    ],
  },
]

export const BRANDS = [
  { name: "Hikvision", handle: "hikvision" },
  { name: "VIGI", handle: "vigi" },
  { name: "TP-Link", handle: "tp-link" },
  { name: "Tapo", handle: "tapo" },
  { name: "Kasa", handle: "kasa" },
  { name: "Mercusys", handle: "mercusys" },
  { name: "Tenda", handle: "tenda" },
  { name: "Kaspersky", handle: "kaspersky" },
  { name: "Norton", handle: "norton" },
  { name: "Quick Heal", handle: "quick-heal" },
]

// Structure only: options start inactive at 0.000 KD so nothing is sold
// until staff set real prices from the admin.
export const ADDON_GROUPS = [
  {
    name_ar: "ترقية الرام",
    name_en: "RAM upgrade",
    kind: "ram" as const,
    options: ["8GB", "16GB", "32GB", "64GB"].map((s) => ({ name_ar: `رام ${s.replace("GB", " جيجا")}`, name_en: `${s} RAM` })),
  },
  {
    name_ar: "SSD إضافي",
    name_en: "Extra SSD",
    kind: "ssd" as const,
    options: ["256GB", "512GB", "1TB", "2TB"].map((s) => ({
      name_ar: `SSD ${s.replace("GB", " جيجا").replace("TB", " تيرا")}`,
      name_en: `${s} NVMe SSD`,
    })),
  },
  {
    name_ar: "هارد إضافي",
    name_en: "Extra hard drive",
    kind: "hdd" as const,
    options: ["1TB", "2TB", "4TB"].map((s) => ({ name_ar: `هارد ${s.replace("TB", " تيرا")}`, name_en: `${s} HDD` })),
  },
  {
    name_ar: "هارد مراقبة للتسجيل",
    name_en: "Surveillance hard drive",
    kind: "hdd" as const,
    options: ["1TB", "2TB", "4TB", "6TB", "8TB"].map((s) => ({
      name_ar: `هارد مراقبة ${s.replace("TB", " تيرا")}`,
      name_en: `${s} surveillance HDD`,
    })),
  },
  {
    name_ar: "كارت ذاكرة",
    name_en: "Memory card",
    kind: "memory_card" as const,
    options: ["64GB", "128GB", "256GB"].map((s) => ({ name_ar: `microSD ${s.replace("GB", " جيجا")}`, name_en: `${s} microSD` })),
  },
  {
    name_ar: "التركيب والبرمجة",
    name_en: "Installation & setup",
    kind: "installation" as const,
    options: [{ name_ar: "تركيب وبرمجة في الموقع", name_en: "On-site installation & setup" }],
  },
]
