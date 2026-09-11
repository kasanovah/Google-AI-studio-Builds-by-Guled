import { GoogleGenAI, Type } from '@google/genai';


export interface ScriptGenerationParams {

  topic: string;

  description?: string;

  targetDuration: number;

  pacing?: string;

  tone?: string;

  customScript?: string;

}


export interface GeneratedSceneScript {

  sceneNumber: number;

  duration: number;

  voiceover: string;

  caption: string;

  keyMessage: string;

  visualObjective: string;

  subject: string;

  action: string;

  environment: string;

  cameraComposition: string;

  visualPrompt: string;

  flowPrompt: string;

  visualKeywords: string[];

  visualUrl?: string;

  videoUrl?: string;

  assetType?: 'video' | 'image';

}


export type TopicDomain =

  | 'AI_AGRICULTURE'

  | 'AI_LANGUAGE'

  | 'AI_FINTECH'

  | 'AI_SECURITY'

  | 'AI_STUDENTS'

  | 'AI_IMAGE_GEN'

  | 'AI_CODING'

  | 'AI_HEALTHCARE'

  | 'AI_BUSINESS'

  | 'AI_ROBOTICS'

  | 'AI_PRODUCTIVITY'

  | 'CUSTOM_GENERAL';


interface SceneBlueprint {

  voiceover: string;

  caption: string;

  keyMessage: string;

  visualObjective: string;

  subject: string;

  action: string;

  environment: string;

  cameraComposition: string;

  visualPrompt: string;

  flowPrompt: string;

  visualKeywords: string[];

  visualUrl?: string;

}


/**

 * Detect domain archetype from topic, description, and custom script text.

 */

export function detectDomain(text: string): TopicDomain {

  const lower = text.toLowerCase();


  // AI Agriculture & Farming

  if (

    lower.includes('beer') ||

    lower.includes('dalag') ||

    lower.includes('agriculture') ||

    lower.includes('farm') ||

    lower.includes('waraab') ||

    lower.includes('cimilad') ||

    lower.includes('abaar')

  ) {

    return 'AI_AGRICULTURE';

  }


  // AI Somali Language & NLP / Voice

  if (

    lower.includes('af-soomaali') ||

    lower.includes('af soomaali') ||

    lower.includes('luuqad') ||

    lower.includes('grammar') ||

    lower.includes('nlp') ||

    lower.includes('translation') ||

    lower.includes('turjumaad') ||

    lower.includes('cod') ||

    lower.includes('voice') ||

    lower.includes('ubax')

  ) {

    return 'AI_LANGUAGE';

  }


  // AI FinTech & Mobile Money (EVC Plus, Zaad, Sahal, Banking)

  if (

    lower.includes('zaad') ||

    lower.includes('evc') ||

    lower.includes('sahal') ||

    lower.includes('lacag') ||

    lower.includes('money') ||

    lower.includes('bank') ||

    lower.includes('bangi') ||

    lower.includes('fintech') ||

    lower.includes('fraud') ||

    lower.includes('dhaqaale') ||

    lower.includes('payment') ||

    lower.includes('invest')

  ) {

    return 'AI_FINTECH';

  }


  // AI Cyber Security & Scams / Digital Defense

  if (

    lower.includes('cyber') ||

    lower.includes('security') ||

    lower.includes('ammaan') ||

    lower.includes('hack') ||

    lower.includes('phish') ||

    lower.includes('password') ||

    lower.includes('privacy') ||

    lower.includes('malware') ||

    lower.includes('khiyaano') ||

    lower.includes('scam')

  ) {

    return 'AI_SECURITY';

  }


  // AI for Students & University Learning

  if (

    lower.includes('arday') ||

    lower.includes('student') ||

    lower.includes('study') ||

    lower.includes('exam') ||

    lower.includes('school') ||

    lower.includes('university') ||

    lower.includes('cashar') ||

    lower.includes('macallin') ||

    lower.includes('learning') ||

    lower.includes('jaamacad')

  ) {

    return 'AI_STUDENTS';

  }


  // AI Image Generation & Creative Art / Design

  if (

    lower.includes('image') ||

    lower.includes('sawir') ||

    lower.includes('midjourney') ||

    lower.includes('dall-e') ||

    lower.includes('art') ||

    lower.includes('design') ||

    lower.includes('naqshad') ||

    lower.includes('creative') ||

    lower.includes('photoshop') ||

    lower.includes('prompt art') ||

    lower.includes('video generation') ||

    lower.includes('sora')

  ) {

    return 'AI_IMAGE_GEN';

  }


  // AI Coding & Software Engineering

  if (

    lower.includes('code') ||

    lower.includes('koodh') ||

    lower.includes('programming') ||

    lower.includes('software') ||

    lower.includes('developer') ||

    lower.includes('python') ||

    lower.includes('javascript') ||

    lower.includes('github') ||

    lower.includes('bug') ||

    lower.includes('app') ||

    lower.includes('engineer')

  ) {

    return 'AI_CODING';

  }


  // AI Healthcare & Medical

  if (

    lower.includes('health') ||

    lower.includes('caafimaad') ||

    lower.includes('doctor') ||

    lower.includes('dhakhtar') ||

    lower.includes('hospital') ||

    lower.includes('isbitaal') ||

    lower.includes('cudur') ||

    lower.includes('dawo') ||

    lower.includes('clinic') ||

    lower.includes('medical')

  ) {

    return 'AI_HEALTHCARE';

  }


  // AI Business, E-Commerce & Customer Service

  if (

    lower.includes('ganacsi') ||

    lower.includes('business') ||

    lower.includes('shop') ||

    lower.includes('sales') ||

    lower.includes('marketing') ||

    lower.includes('customer') ||

    lower.includes('macaamiil') ||

    lower.includes('startup') ||

    lower.includes('suuq') ||

    lower.includes('ecommerce')

  ) {

    return 'AI_BUSINESS';

  }


  // AI Robotics & Automation / Hardware

  if (

    lower.includes('robot') ||

    lower.includes('hardware') ||

    lower.includes('automation') ||

    lower.includes('drone') ||

    lower.includes('autonomous') ||

    lower.includes('gaari') ||

    lower.includes('car') ||

    lower.includes('warshad') ||

    lower.includes('factory')

  ) {

    return 'AI_ROBOTICS';

  }


  // AI Productivity & Daily Time Saving

  if (

    lower.includes('waqti') ||

    lower.includes('productivity') ||

    lower.includes('badbaadin') ||

    lower.includes('time') ||

    lower.includes('schedule') ||

    lower.includes('calendar') ||

    lower.includes('email') ||

    lower.includes('task') ||

    lower.includes('qoraal')

  ) {

    return 'AI_PRODUCTIVITY';

  }


  return 'CUSTOM_GENERAL';

}


/**

 * Builds 6 distinct, sequential, narrative scenes explaining the user's topic.

 * ZERO generic asset reuse. Every scene has dedicated keyMessage, visualObjective,

 * subject, action, environment, and cameraComposition.

 */

export function generateDomainBlueprints(domain: TopicDomain, _cleanTopic: string): SceneBlueprint[] {

  switch (domain) {

    case 'AI_AGRICULTURE':

      return [

        {

          voiceover: `Beeraha Soomaaliya waxay maanta marayaan marxalad cusub: AI wuxuu xallinayaa caqabadaha abaarta iyo waraabka.`,

          caption: `1. Caqabadda Biyaha & Abaarta`,

          keyMessage: `Isbeddelka cimilada iyo baahida xalalka casriga ah ee beeraha`,

          visualObjective: `Visualizing dry agricultural fields needing automated intelligence`,

          subject: `Beeraha qallalan & dareemaha AI ee carrada`,

          action: `Dareemaha carrada oo cabbiraya heerka qoyaanka`,

          environment: `Dhul beereedka Shabeellada Hoose waaberigii`,

          cameraComposition: `Macro ground-level POV with dramatic volumetric morning rim light`,

          visualPrompt: `Macro ground-level POV of Somali agricultural soil with smart glowing digital soil moisture probe scanning root levels, golden dawn lighting`,

          flowPrompt: `Vertical 9:16 cinematic ground tracking shot of agricultural soil with glowing moisture sensor telemetry, 24fps`,

          visualKeywords: ['soil probe', 'somali agriculture', 'moisture sensor'],

        },

        {

          voiceover: `Satelite-yada iyo diyaaradaha drones-ka waxay hawada sare ka cabbiraan qoyaanka carrada iyo xaaladda dalagga.`,

          caption: `2. Baaritaanka Hawada Sare`,

          keyMessage: `Drones-ka iyo satelite-yada oo saadaaliya roobka iyo caafimaadka dalagga`,

          visualObjective: `Airborne multispectral scanning of farmland`,

          subject: `Diyaarad Drone ah oo kormeereysa dalagga`,

          action: `Qalabka drone-ka oo dul maraya beerta falanqeynayana caleemaha`,

          environment: `Hawada sare ee beero cagaaran oo ballaaran`,

          cameraComposition: `High-angle bird-eye sweeping tracking shot`,

          visualPrompt: `High-angle bird-eye view of smart agricultural drone scanning lush Somali farmland with cyan laser telemetry grids`,

          flowPrompt: `Vertical 9:16 cinematic drone flight tracking across green crop fields with overlaid spectral NDVI telemetry, 24fps`,

          visualKeywords: ['agricultural drone', 'crop health', 'aerial scan'],

        },

        {

          voiceover: `Nidaamka waraabka tooska ah wuxuu biyaha furaa kaliya marka dhirtu u baahan tahay, isagoo badbaadinaya boqolkiiba afartan biyaha.`,

          caption: `3. Waraabka Tooska Ah Ee AI`,

          keyMessage: `Badbaadinta biyaha iyadoo la adeegsanayo waraabka tooska ah`,

          visualObjective: `Automated smart drip irrigation valve activating automatically`,

          subject: `Qasabadaha waraabka ee caqliga badan`,

          action: `Qulqulka biyaha tooska ah ee ku socda xididdada geedaha`,

          environment: `Nidaamka waraabka dhibcaha ee beero tusaale ah`,

          cameraComposition: `Low-angle dynamic water spray close-up with sunlight refraction`,

          visualPrompt: `Low-angle dynamic shot of automated drip irrigation micro-nozzles releasing precise water droplets onto healthy corn seedlings, sunlit droplets`,

          flowPrompt: `Vertical 9:16 cinematic slow-motion close-up of micro-drip irrigation system hydrating plant roots, 24fps`,

          visualKeywords: ['drip irrigation', 'water conservation', 'smart valve'],

        },

        {

          voiceover: `Xitaa beeralayda yar-yar waxay taleefannadooda gacanta ku helayaan digniino deg-deg ah oo ku saabsan cayayaanka iyo cudurrada.`,

          caption: `4. Digniinta Cayayaanka & Cudurrada`,

          keyMessage: `Taleefanka gacanta oo qabanaya cudurrada dhirta ka hor intaysan faafin`,

          visualObjective: `Mobile camera scanning a plant leaf and diagnosing leaf rust`,

          subject: `Taleefanka gacanta oo sawiraya caleen jiran`,

          action: `Kaamirada taleefanka oo falanqeyneysa calaamadaha cudurka caleenta`,

          environment: `Beeraley gacantiisa ku haya taleefan casri ah beerta dhexdeeda`,

          cameraComposition: `Over-the-shoulder medium close-up focusing on phone screen interface`,

          visualPrompt: `Over-the-shoulder medium shot of Somali farmer holding smartphone scanning a plant leaf with AI diagnosis bounding box`,

          flowPrompt: `Vertical 9:16 cinematic screen-level view of AI disease detector highlighting fungal spores on green leaf, 24fps`,

          visualKeywords: ['crop disease detection', 'smartphone ai', 'farmer tech'],

        },

        {

          voiceover: `Natiijadu waa wax-soo-saar labanlaab ah, cunto tayo leh, iyo dhaqaale kobcaya oo dalka gaarsiiya isku-filnaansho buuxda.`,

          caption: `5. Wax-Soo-Saar Labanlaab Ah`,

          keyMessage: `Kordhinta wax-soo-saarka iyo isku-filnaanshaha cuntada qaranka`,

          visualObjective: `Abundant harvest market with overflowing fresh produce`,

          subject: `Dalagyo bisil oo tayo sare leh`,

          action: `Gurashada dalagga cusub iyo suuqgeynta casriga ah`,

          environment: `Goobta dalag-ururinta iyo suuqa beeraha ee casriga ah`,

          cameraComposition: `Hero golden-hour tracking shot through rich harvested fields`,

          visualPrompt: `Hero golden-hour tracking shot through rich harvested Somali tomato and grain fields with vibrant healthy yields`,

          flowPrompt: `Vertical 9:16 cinematic golden hour tracking shot of abundant agricultural harvest baskets, 24fps`,

          visualKeywords: ['food abundance', 'harvest payoff', 'food security'],

        },

        {

          voiceover: `Baro sida AI loogu dabaqo beeraha! Ku xirnow Xeero AI si aad u hesho talooyinka tignoolajiyada casriga ah.`,

          caption: `Ku Xirnow Xeero AI!`,

          keyMessage: `Kula xirir Xeero AI si aad u hesho xalka tignoolajiyada beeraha`,

          visualObjective: `Xeero AI agricultural tech interface and community learning hub`,

          subject: `Xeero AI Digital Studio & Platform`,

          action: `Shaashadaha Xeero AI oo soo bandhigaya nidaamyada beeraha casriga ah`,

          environment: `Xeero AI Media Studio Mogadishu`,

          cameraComposition: `Cinematic centered slow push-in to studio display screen`,

          visualPrompt: `Cinematic centered slow push-in to sleek Xeero AI media display showing Somali smart agriculture dashboard, 24fps`,

          flowPrompt: `Vertical 9:16 cinematic slow push-in to Xeero AI creative studio showcase with vibrant emerald screens and Somali tech branding, 24fps`,

          visualKeywords: ['xeero studio', 'closing cta', 'somali agri-tech'],

        },

      ];


    case 'AI_SECURITY':

      return [

        {

          voiceover: `Farriimaha been-abuurka ah iyo jabsiga taleefannada ayaa maanta halis ku ah qof kasta oo adeegsada internet-ka.`,

          caption: `1. Halista Jabsiga & Khiyaanada`,

          keyMessage: `Fahamka weerarrada digital-ka ah iyo xatooyada aqoonsiga`,

          visualObjective: `Visualizing unauthorized data interception attempts`,

          subject: `Shaashad digniin ah oo muujinaysa isku-day jabsasho`,

          action: `Giraamaha amniga oo qabanaya weerar phishing ah`,

          environment: `Qolka ilaalinta xogta digital-ka ah`,

          cameraComposition: `Dramatic macro POV with intense crimson rim lighting`,

          visualPrompt: `Dramatic macro POV of smartphone receiving deceptive phishing SMS with glowing red cyber warning perimeter`,

          flowPrompt: `Vertical 9:16 cinematic tracking of malicious digital code attempting unauthorized access, 24fps`,

          visualKeywords: ['phishing attack', 'cyber threat', 'identity security'],

        },

        {

          voiceover: `Tallaabada kowaad: Ha riixin links-ka shakiga leh ee laguugu soo diro WhatsApp ama SMS adigoon xaqiijin cidda dirtay.`,

          caption: `2. Ha Riixin Links-ka Shakiga Leh`,

          keyMessage: `Xaqiijinta ilaha fariimaha ka hor intaanan la furin`,

          visualObjective: `Magnified inspection of fraudulent link structure`,

          subject: `Farta qofka oo istaageysa ka hor intaysan link shaki leh riixin`,

          action: `AI amniga oo falanqeynaya URL-ka been-abuurka ah`,

          environment: `Shaashadda taleefanka gacanta`,

          cameraComposition: `Extreme close-up macro of touch interaction`,

          visualPrompt: `Extreme close-up macro of finger pausing over suspicious text link with AI security radar highlighting fake domain`,

          flowPrompt: `Vertical 9:16 cinematic close-up of suspicious hyperlink being analyzed by holographic scanner, 24fps`,

          visualKeywords: ['link verification', 'stop clicking', 'anti-phishing'],

        },

        {

          voiceover: `Tallaabada labaad: Daaro xaqiijinta laba-tallaabo (2-Factor Authentication) koontooyinkaaga WhatsApp, Gmail, iyo bangiyada.`,

          caption: `3. Daaro Xaqiijinta 2-Factor`,

          keyMessage: `Ilaalinta koontooyinka furaha labaad ee SMS ama Authenticator`,

          visualObjective: `Two-factor authentication shield locking tightly`,

          subject: `Furaha amniga ee laba-geesoodka ah iyo lambarka xaqiijinta`,

          action: `Xaqiijinta furaha OTP oo xiraya gelitaanka sharci-darrada ah`,

          environment: `Kootada digital-ka ah ee isticmaalaha`,

          cameraComposition: `Isometric 3D lock visualization with glowing emerald encryption`,

          visualPrompt: `Isometric 3D holographic digital padlock snapping shut with glowing emerald encryption rings and OTP verification prompt`,

          flowPrompt: `Vertical 9:16 cinematic 3D animation of security vault locking into encrypted fortress mode, 24fps`,

          visualKeywords: ['two factor auth', 'security shield', 'account lock'],

        },

        {

          voiceover: `AI wuxuu maanta si toos ah u ogaanayaa hab-dhaqanka aan caadiga ahayn, isagoo joojinaya lacag-bixinta aan fasaxa loo haysan.`,

          caption: `4. Difaaca Tooska Ah Ee AI`,

          keyMessage: `AI-ga baanka oo si toos ah u joojiya macaamilka shakiga leh`,

          visualObjective: `Real-time biometric and neural behavioral defense matrix`,

          subject: `Habka ilaalinta macaamilka lacagaha`,

          action: `Joojinta lacag-bixinta marka la dareemo khiyaano`,

          environment: `Xarunta amniga server-yada mobile money`,

          cameraComposition: `Dynamic multi-angle telemetry monitoring display`,

          visualPrompt: `Dynamic telemetry grid tracing financial data flow, instantly intercepting and freezing fraudulent unauthorized withdrawal`,

          flowPrompt: `Vertical 9:16 cinematic neural firewall isolating and neutralizing suspicious transaction stream, 24fps`,

          visualKeywords: ['ai firewall', 'fraud detection', 'instant block'],

        },

        {

          voiceover: `Amnigaaga digital-ka ah waa hantidaada koowaad. Had iyo jeer cusbooneysii qalabkaaga hana la wadaagin furahaaga cidna.`,

          caption: `5. Amnigaaga Waa Hantidaada`,

          keyMessage: `Ilaalinta sirta furayaasha iyo cusbooneysiinta joogtada ah`,

          visualObjective: `Protected user calmly transacting with complete security confidence`,

          subject: `Qof xogtiisa digital-ka ah si buuxda u ilaashanaya`,

          action: `Xaqiijinta biometric-ka wejiga ama faraha si ammaan ah`,

          environment: `Magaalada Mogadishu oo qofku si deggan ugu adeegsanayo taleefankiisa`,

          cameraComposition: `Confident eye-level portrait with warm protective aura`,

          visualPrompt: `Confident eye-level portrait of Somali professional securely approving transactions via fingerprint biometrics, ambient safety glow`,

          flowPrompt: `Vertical 9:16 cinematic portrait of user smiling with certified green biometric checkmark, 24fps`,

          visualKeywords: ['biometric safety', 'digital peace of mind', 'secure user'],

        },

        {

          voiceover: `La wadaag asxaabtaada si ay uga feejignaadaan khiyaanada! Ku xirnow Xeero AI si aad u barato amniga digital-ka ah.`,

          caption: `Ku Xirnow Xeero AI!`,

          keyMessage: `Kula xirir Xeero AI si aad u barato aqoonta amniga casriga ah`,

          visualObjective: `Xeero AI Cyber Studio and security educational portal`,

          subject: `Xeero AI Security Hub`,

          action: `Baahinta wacyigelinta amniga qaranka`,

          environment: `Xeero AI Media Studio`,

          cameraComposition: `Cinematic centered slow push-in`,

          visualPrompt: `Cinematic centered slow push-in to sleek Xeero AI Cyber Studio displaying Somali cyber defense tips, 24fps`,

          flowPrompt: `Vertical 9:16 cinematic studio camera tracking into Xeero AI glowing cyan cyber interface, 24fps`,

          visualKeywords: ['xeero studio', 'cyber defense cta', 'somali awareness'],

        },

      ];


    case 'AI_FINTECH':

      return [

        {

          voiceover: `Soomaaliya waa hormuudka adduunka ee lacagaha taleefanka lagu diro, laakiin sidee AI u beddelayaa habka ganacsiga?`,

          caption: `1. Kacaanka Lacagaha Mobile-ka`,

          keyMessage: `Doorka Soomaaliya ee hormuudnimada lacagaha mobile money`,

          visualObjective: `Visualizing high-volume mobile money circulation in Somali cities`,

          subject: `Taleefanka gacanta oo lacag lagu kala wareejinayo`,

          action: `Dirista deg-degga ah ee lacagaha EVC Plus iyo Zaad`,

          environment: `Suuqa Bakaaraha oo ganacsi firfircoon ka socdo`,

          cameraComposition: `Dynamic low-angle street view tracking mobile payments`,

          visualPrompt: `Dynamic low-angle street view of vibrant Mogadishu commercial market with glowing digital currency flow pulses around merchant smartphones`,

          flowPrompt: `Vertical 9:16 cinematic street-level tracking of Somali merchant verifying instant digital payment, 24fps`,

          visualKeywords: ['mobile money', 'somali commerce', 'evc plus'],

        },

        {

          voiceover: `Kow: AI wuxuu dukaamada u sahlayaa in macaamiishu wax ku iibsadaan aqoonsiga wejiga ama QR Code toos ah ilbiriqsiyo gudahood.`,

          caption: `2. Lacag-Bixinta QR & Wejiga`,

          keyMessage: `Iibsiga deg-degga ah iyadoo la adeegsanayo QR Code iyo aqoonsiga wejiga`,

          visualObjective: `Instant QR code scan and microsecond payment confirmation`,

          subject: `Kaamirada taleefanka oo sawireysa QR Code-ka dukaanka`,

          action: `Lacag-bixinta oo ku fulaysa ilbiriqsiyo gudahood`,

          environment: `Dukaan casri ah oo ku yaalla magaalada`,

          cameraComposition: `Tight dynamic angle on phone scanning terminal`,

          visualPrompt: `Tight dynamic shot of modern Somali grocery customer scanning vibrant neon QR code terminal, instant green success glow`,

          flowPrompt: `Vertical 9:16 cinematic close-up of payment QR code triggering instant transaction confirmation, 24fps`,

          visualKeywords: ['qr payment', 'instant checkout', 'contactless'],

        },

        {

          voiceover: `Laba: Nidaamyada AI waxay xisaabiyaan dakhliga iyo kharashka dukaanka, iyagoo si toos ah u soo saaraya warbixinnada maaliyadda.`,

          caption: `3. Xisaabinta & Warbixinta Tooska Ah`,

          keyMessage: `Maareynta hantida dukaanka iyadoo aan qalin iyo buug loo baahnayn`,

          visualObjective: `Automated financial ledger compiling profit graphs`,

          subject: `Shaashadda xisaabinta dukaanka oo si toos ah isu xisaabinaysa`,

          action: `Garaafyada faa'iidada oo kor u kacaya`,

          environment: `Xafiiska maamulka ganacsiga yar`,

          cameraComposition: `High-contrast UI telemetry display angle`,

          visualPrompt: `High-contrast modern tablet display showing Somali automated store ledger, real-time revenue analytics, and green profit curves`,

          flowPrompt: `Vertical 9:16 cinematic UI camera tracking dynamic financial analytics charts ascending, 24fps`,

          visualKeywords: ['bookkeeping ai', 'store revenue', 'analytics'],

        },

        {

          voiceover: `Saddex: Nidaamka dhibcaha amaahda (Credit Scoring) wuxuu u sahlayaa dhalinyarada ganacsiga bilaabaya inay helaan maalgashi.`,

          caption: `4. Fursadaha Maalgashiga & Amaahda`,

          keyMessage: `Helitaanka maalgashi iyadoo lagu saleynayo kalsoonida AI-da baanka`,

          visualObjective: `Micro-entrepreneur receiving approved business credit notification`,

          subject: `Dhalinyaro ganacsade ah oo helay fariinta maalgashiga`,

          action: `Taleefanka oo soo bandhigaya ogolaanshaha maalgashiga`,

          environment: `Xarun ganacsi cusub oo furmaysa`,

          cameraComposition: `Medium portrait focusing on genuine entrepreneurial joy`,

          visualPrompt: `Medium portrait of young Somali entrepreneur smiling as their smartphone displays an approved micro-business credit notification`,

          flowPrompt: `Vertical 9:16 cinematic portrait of young merchant expanding inventory with approved capital, 24fps`,

          visualKeywords: ['credit scoring', 'financial inclusion', 'entrepreneur'],

        },

        {

          voiceover: `FinTech-ku wuxuu dalkeena u horseedayaa dhaqaale casri ah oo aan lacag caddaan ah loo baahnayn, qof kastana fursad siinaya.`,

          caption: `5. Dhaqaale Casri Ah Oo Ballaaran`,

          keyMessage: `Mustaqbalka dhaqaalaha casriga ah ee Soomaaliya`,

          visualObjective: `Interconnected financial network across Horn of Africa`,

          subject: `Isku-xirka dhaqaalaha digital-ka ah ee gobolka`,

          action: `Xogta maaliyadda oo si nabad ah isugu gudbeysa`,

          environment: `Muuqaalka guud ee caasimadda oo ifaya habeenkii`,

          cameraComposition: `Sweeping panoramic night skyline with glowing gold financial nodes`,

          visualPrompt: `Sweeping panoramic night skyline of Mogadishu coast connected with glowing golden data vectors symbolizing digital financial transactions`,

          flowPrompt: `Vertical 9:16 cinematic aerial drone sweep over illuminated coastal city with connected digital transactions, 24fps`,

          visualKeywords: ['cashless economy', 'somali future', 'fintech network'],

        },

        {

          voiceover: `Baro sida AI loogu kobciyo ganacsigaaga! Ku xirnow Xeero AI si aad u barato tignoolajiyada maaliyadda casriga ah.`,

          caption: `Ku Xirnow Xeero AI!`,

          keyMessage: `Ku xirnow Xeero AI si aad u barato FinTech-ka casriga ah`,

          visualObjective: `Xeero AI FinTech studio showcase`,

          subject: `Xeero AI Studio`,

          action: `Soo bandhigidda casharrada ganacsiga casriga ah`,

          environment: `Xeero AI Media Studio`,

          cameraComposition: `Cinematic centered slow push-in`,

          visualPrompt: `Cinematic centered slow push-in to sleek Xeero AI media display showing Somali FinTech innovations, 24fps`,

          flowPrompt: `Vertical 9:16 cinematic studio camera tracking into glowing gold and teal Xeero AI interface, 24fps`,

          visualKeywords: ['xeero studio', 'fintech cta', 'somali business'],

        },

      ];


    case 'AI_LANGUAGE':
      // falls through — AI_LANGUAGE intentionally shares the default blueprint

    default:

      return [

        {

          voiceover: `Luuqadda Soomaaligu waxay gashay xilligii AI: Hadda moodallada caalamiga ahi waxay si buuxda u fahmayaan hadalka iyo qoraalka Af-Soomaaliga.`,

          caption: `1. Kacaanka Luuqadda Soomaaliga`,

          keyMessage: `Fahamka AI ee codka iyo naxwaha Af-Soomaaliga`,

          visualObjective: `Visualizing soundwaves transforming into semantic neural tokens`,

          subject: `Hirarka codka Soomaaliga oo galaya shabakad neural ah`,

          action: `Codka hadalka oo isu beddelaya macne qoraal ah`,

          environment: `Shabakadda maskaxda digital-ka ah (Neural Matrix)`,

          cameraComposition: `Macro 3D soundwave tracking shot with sapphire light trails`,

          visualPrompt: `Macro 3D soundwave visualization of spoken Somali words converting into radiant cyan neural network tokens across dark digital void`,

          flowPrompt: `Vertical 9:16 cinematic camera flying through luminous Somali phonetic soundwaves entering a neural network, 24fps`,

          visualKeywords: ['somali speech', 'soundwaves', 'neural tokens'],

        },

        {

          voiceover: `Tallaabada kowaad: Voice AI-da casriga ahi waxay codka qofka u rogeysaa qoraal sax ah, iyadoo fahmaysa lahjadaha kala duwan.`,

          caption: `2. Codka Oo Qoraal Isu Rogaya`,

          keyMessage: `Turjumaadda codka oo qoraal sax ah noqonaya`,

          visualObjective: `Microphone recording voice and instantly generating precise Somali text`,

          subject: `Mikrafoonka casriga ah iyo qoraalka deg-degga ah`,

          action: `Qoraalka oo shaashadda kaga soo baxaya xawaare sare`,

          environment: `Xarunta duubista codka iyo cilmi-baarista`,

          cameraComposition: `Tight dynamic focus on pulsating acoustic waveform`,

          visualPrompt: `Tight dynamic shot of studio condenser microphone glowing with blue acoustic soundwave telemetry turning into Somali typography`,

          flowPrompt: `Vertical 9:16 cinematic close-up of Somali script appearing dynamically from audio pulses, 24fps`,

          visualKeywords: ['speech to text', 'somali acoustics', 'voice ai'],

        },

        {

          voiceover: `Tallaabada labaad: Buugaagta cilmiga iyo casharrada jaamacadaha adduunka ayaa hadda Af-Soomaali lagu akhrisan karaa ilbiriqsiyo gudahood.`,

          caption: `3. Turjumaadda Cilmiga & Buugaagta`,

          keyMessage: `U turjumidda aqoonta caalamiga ah Af-Soomaali`,

          visualObjective: `Scientific textbooks and code tutorials translated into clear Somali`,

          subject: `Buugga cilmiga oo bogagiisa loo turjumayo Af-Soomaali`,

          action: `Qoraalka oo toos isu beddelaya luuqadda hooyo`,

          environment: `Maktabadda waxbarashada digital-ka ah`,

          cameraComposition: `Overhead dynamic angle on open interactive tablet`,

          visualPrompt: `Overhead dynamic shot of illuminated digital tablet instantly translating complex medical and engineering texts into elegant Somali script`,

          flowPrompt: `Vertical 9:16 cinematic view of international textbook pages morphing seamlessly into Somali language, 24fps`,

          visualKeywords: ['instant translation', 'mother tongue education', 'somali book'],

        },

        {

          voiceover: `Tallaabada saddexaad: Xarumaha macaamiisha iyo shirkadaha waxay adeegsanayaan chatbots ku hadla Af-Soomaali dabiici ah oo cad.`,

          caption: `4. Kaaliyayaasha Codka Ee Shirkadaha`,

          keyMessage: `U adeegidda macaamiisha cod iyo qoraal Af-Soomaali ah`,

          visualObjective: `Customer conversing with friendly Somali AI voice assistant`,

          subject: `Kaaliyaha codka ee taleefanka`,

          action: `Ka jawaabista su'aalaha macaamiisha si xushmad leh`,

          environment: `Xafiiska adeegga macaamiisha`,

          cameraComposition: `Medium interactive split-screen perspective`,

          visualPrompt: `Medium shot of customer smiling while having effortless natural voice conversation with conversational Somali mobile assistant`,

          flowPrompt: `Vertical 9:16 cinematic interaction of user hearing clear natural Somali speech response on smartphone, 24fps`,

          visualKeywords: ['conversational ai', 'somali chatbot', 'customer support'],

        },

        {

          voiceover: `Tani waxay dhalinyaradeena u sahlaysaa inay noqdaan hal-abuurayaal dhisa barnaamijyo ku hadla afkooda hooyo, mustaqbalkana hoggaamiya.`,

          caption: `5. Mustaqbalka & Hal-Abuurka`,

          keyMessage: `Hoggaaminta tignoolajiyada afka hooyo ee dhalinyarada`,

          visualObjective: `Young Somali engineers celebrating launch of indigenous AI model`,

          subject: `Injineero dhalinyaro ah oo barnaamijyo AI ah dhisaya`,

          action: `Dabaaldegga guusha nidaam cusub oo Af-Soomaali ah`,

          environment: `Xarunta hal-abuurka tignoolajiyada ee Muqdisho`,

          cameraComposition: `Hero group shot filled with inspiration and golden natural light`,

          visualPrompt: `Hero group shot of innovative young Somali software engineers standing proudly in modern tech lab celebrating Somali language AI milestone`,

          flowPrompt: `Vertical 9:16 cinematic uplifting shot of Somali tech creators collaborating on futuristic interface, 24fps`,

          visualKeywords: ['youth empowerment', 'indigenous tech', 'somali pride'],

        },

        {

          voiceover: `Horumari aqoontaada adoo adeegsanaya AI! Ku xirnow Xeero AI si aad u barato xirfadaha mustaqbalka.`,

          caption: `Ku Xirnow Xeero AI!`,

          keyMessage: `Ku xirnow Xeero AI si aad u barato aaladaha casriga ah`,

          visualObjective: `Xeero AI Studio glowing portal`,

          subject: `Xeero AI Media Studio`,

          action: `Kula xiriirka bulshada iyo barashada tignoolajiyada`,

          environment: `Xeero AI Media Studio`,

          cameraComposition: `Cinematic centered slow push-in`,

          visualPrompt: `Cinematic centered slow push-in to sleek Xeero AI media display with vibrant blue and cyan screens, 24fps`,

          flowPrompt: `Vertical 9:16 cinematic studio camera tracking into Xeero AI glowing interface, 24fps`,

          visualKeywords: ['xeero studio', 'closing cta', 'somali ai future'],

        },

      ];

  }

}


/**

 * Structured JSON schema Gemini must follow. Mirrors SceneBlueprint exactly so

 * the response can be dropped straight into GeneratedSceneScript with zero

 * post-processing guesswork.

 */

const GEMINI_SCRIPT_SCHEMA = {

  type: Type.OBJECT,

  properties: {

    title: {

      type: Type.STRING,

      description: 'Short, scroll-stopping Somali title for the reel (max ~8 words).',

    },

    scenes: {

      type: Type.ARRAY,

      minItems: '6',

      maxItems: '6',

      items: {

        type: Type.OBJECT,

        properties: {

          voiceover: { type: Type.STRING, description: 'Natural spoken Somali narration for this scene, one or two sentences.' },

          caption: { type: Type.STRING, description: 'Short on-screen Somali caption/headline for this scene, prefixed with its scene number for scenes 1-5 (e.g. "1. ..."), and exactly "Ku Xirnow Xeero AI!" for the final scene.' },

          keyMessage: { type: Type.STRING, description: 'One-sentence Somali summary of this scene\'s core point.' },

          visualObjective: { type: Type.STRING, description: 'English description of what the visual should communicate.' },

          subject: { type: Type.STRING, description: 'Somali description of the main visual subject.' },

          action: { type: Type.STRING, description: 'Somali description of what is happening/moving in the shot.' },

          environment: { type: Type.STRING, description: 'Somali description of the setting/location.' },

          cameraComposition: { type: Type.STRING, description: 'English camera/shot description (e.g. "Macro ground-level POV with dramatic rim lighting").' },

          visualPrompt: { type: Type.STRING, description: 'English cinematic image-generation prompt for a 9:16 still, matching the scene.' },

          flowPrompt: { type: Type.STRING, description: 'English 9:16 24fps video-generation prompt for this scene, in the style "Vertical 9:16 cinematic ... , 24fps".' },

          visualKeywords: {

            type: Type.ARRAY,

            items: { type: Type.STRING },

            minItems: '2',

            maxItems: '4',

            description: 'Short English tag words for this scene\'s visual.',

          },

        },

        required: [

          'voiceover', 'caption', 'keyMessage', 'visualObjective', 'subject',

          'action', 'environment', 'cameraComposition', 'visualPrompt', 'flowPrompt', 'visualKeywords',

        ],

      },

    },

  },

  required: ['title', 'scenes'],

};


/**

 * Real AI script generation via the Gemini API.

 *

 * Produces a genuinely dynamic 6-scene Somali script for ANY topic (not limited

 * to the fixed template domains below). Requires GEMINI_API_KEY to be set;

 * throws on any failure so the caller can fall back to the offline templates

 * rather than ever serving a broken/empty script.

 */

export async function generateScenesWithGemini(params: {

  topic: string;

  description?: string;

  targetDuration: number;

}): Promise<{ title: string; scenes: SceneBlueprint[] }> {

  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey) {

    throw new Error('GEMINI_API_KEY is not configured');

  }


  const { topic, description = '', targetDuration } = params;

  const sceneCount = 6;

  const approxWordsPerScene = Math.max(8, Math.round(((targetDuration / sceneCount) * 2.6)));


  const ai = new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
      // A hung request would otherwise block this job indefinitely; bounding
      // it means a bad model attempt fails fast enough for the next
      // candidate in the fallback list below to get a real chance.
      timeout: 60_000,
    },
  });

  // Filter out any discontinued/deprecated models (like 2.5, 2.0, 1.5)
  const envModel = process.env.GEMINI_MODEL?.trim();
  const isDeprecated = envModel && (
    envModel.includes('2.5') ||
    envModel.includes('2.0') ||
    envModel.includes('1.5') ||
    envModel.includes('gemini-pro')
  );

  // Preferred model order: gemini-3.6-flash, gemini-3.1-flash-lite, gemini-3.8-flash, gemini-flash-latest
  const candidateModels: string[] = [
    envModel && !isDeprecated ? envModel : 'gemini-3.6-flash',
    'gemini-3.6-flash',
    'gemini-3.1-flash-lite',
    'gemini-3.8-flash',
    'gemini-flash-latest',
  ].filter((m, idx, arr) => arr.indexOf(m) === idx);

  const prompt = `You are the senior scriptwriter for Xeero AI, a Somali-language AI/technology media brand. Write a complete 6-scene vertical (9:16) Reel script explaining the following topic to a Somali-speaking audience in Somalia and worldwide.

TOPIC: "${topic}"
${description ? `ADDITIONAL CONTEXT: "${description}"\n` : ''}
TARGET TOTAL DURATION: ${targetDuration} seconds across exactly 6 scenes (~${Math.round(targetDuration / sceneCount)}s each).

STRICT SOMALI LANGUAGE RULES:
- Write "voiceover", "caption", "keyMessage", "subject", "action", and "environment" fields in natural, fluent, professional Somali. Never machine-translated or awkward phrasing. No calques.
- Do not reach for an English word when a natural, commonly understood Somali word exists — translate it. Only keep a term in English when Somali speakers genuinely use that English word in everyday speech and no natural Somali equivalent exists (e.g. "AI", "app", "internet", "email"). When in doubt, prefer the Somali word.
- Company and product names (e.g. Google, OpenAI, Nvidia) take FEMININE grammatical agreement in Somali (waxay/ay/-tay), never masculine (wuxuu/uu/-ay).
- Each scene's voiceover should be roughly ${approxWordsPerScene} words — enough to comfortably fill ~${Math.round(targetDuration / sceneCount)} seconds of natural spoken pacing (about 2-3 words per second), not more.

STRUCTURE (exactly 6 scenes, in order):
1. Hook — state the problem or surprising fact that makes someone stop scrolling in the first 2-3 seconds. Never open with a generic greeting or announcement like "Asc dhammaan", "Maanta waxaan ka hadlaynaa...", or "Ku soo dhawaada..." — lead with the curiosity or value itself, e.g. the style of "AI-kan wuxuu kuu qaban karaa shaqo aad saacado ku qaadan lahayd."
2-5. Explanation — build the idea step by step with concrete, specific detail (not vague generalities). Each scene must be visually and narratively distinct from the others — no repeated concepts.
6. Outro/CTA — close with an inspiring one-line takeaway, and set caption to exactly "Ku Xirnow Xeero AI!" (voiceover can vary but should invite the viewer to follow Xeero AI).

VISUAL FIELDS (English):
- "visualObjective", "cameraComposition", "visualPrompt", "flowPrompt", and "visualKeywords" must be written in English, describing a premium, cinematic, Bloomberg/Reuters-editorial-style 9:16 visual specific to that exact scene's content — never generic stock-photo description.
- "visualPrompt" is for a still image generator; "flowPrompt" is for a video generator and must start with "Vertical 9:16 cinematic" and end with "24fps".
- If the same person, product, or setting reasonably recurs across multiple scenes, describe their visual details (appearance, clothing, environment) identically every time they appear, so the Reel reads as one continuous world rather than six unrelated images.

Return ONLY the structured data — no extra commentary.`;

  let lastError: any = null;
  let rawText: string | undefined;

  for (const model of candidateModels) {
    try {
      const response = await ai.models.generateContent({
        model,
        contents: prompt,
        config: {
          responseMimeType: 'application/json',
          responseSchema: GEMINI_SCRIPT_SCHEMA,
          temperature: 0.9,
        },
      });

      const text = response.text;
      if (text && text.trim()) {
        rawText = text;
        console.log(`[ScriptGenerator] Successfully generated script using model: ${model}`);
        break;
      }
    } catch (err: any) {
      lastError = err;
      console.warn(`[ScriptGenerator] Attempt with model "${model}" failed (${err?.message || err}). Trying fallback model...`);
    }
  }

  if (!rawText || !rawText.trim()) {
    throw new Error(lastError?.message || 'Gemini returned an empty response');
  }


  let parsed: { title?: string; scenes?: any[] };

  try {

    parsed = JSON.parse(rawText);

  } catch (err: any) {

    throw new Error(`Gemini returned invalid JSON: ${err?.message}`, { cause: err });

  }


  if (!parsed.scenes || !Array.isArray(parsed.scenes) || parsed.scenes.length !== sceneCount) {

    throw new Error(`Gemini returned ${parsed.scenes?.length ?? 0} scenes, expected ${sceneCount}`);

  }


  const blueprints: SceneBlueprint[] = parsed.scenes.map((s: any, idx: number) => {

    const required = ['voiceover', 'caption', 'keyMessage', 'visualObjective', 'subject', 'action', 'environment', 'cameraComposition', 'visualPrompt', 'flowPrompt'];

    for (const field of required) {

      if (!s[field] || typeof s[field] !== 'string' || !s[field].trim()) {

        throw new Error(`Gemini scene ${idx + 1} is missing required field "${field}"`);

      }

    }

    return {

      voiceover: s.voiceover.trim(),

      caption: s.caption.trim(),

      keyMessage: s.keyMessage.trim(),

      visualObjective: s.visualObjective.trim(),

      subject: s.subject.trim(),

      action: s.action.trim(),

      environment: s.environment.trim(),

      cameraComposition: s.cameraComposition.trim(),

      visualPrompt: s.visualPrompt.trim(),

      flowPrompt: s.flowPrompt.trim(),

      visualKeywords: Array.isArray(s.visualKeywords) && s.visualKeywords.length > 0

        ? s.visualKeywords.map((k: any) => String(k))

        : ['xeero ai', topic.slice(0, 15), `scene ${idx + 1}`],

    };

  });


  return {

    title: (parsed.title || topic || 'Xeero AI Reel').trim(),

    scenes: blueprints,

  };

}


/**

 * Generate a complete, coherent 6-scene Somali Reel script.

 * Zero duplicate visual concepts. Zero banned assets.

 */

export async function generateSomaliScript(params: ScriptGenerationParams): Promise<{

  title: string;

  topic: string;

  targetDuration: number;

  scenes: GeneratedSceneScript[];

}> {

  const { topic, description = '', targetDuration = 30, customScript } = params;

  const combinedInput = `${topic} ${description} ${customScript || ''}`.trim();

  const domain = detectDomain(combinedInput);

  const cleanTopic = topic ? topic.trim() : 'Horumarka AI';


  let blueprints: SceneBlueprint[] = [];


  // =========================================================================

  // Case 1: Custom User Script parsing

  // =========================================================================

  if (customScript && customScript.trim().length > 20) {

    const rawLines = customScript

      .split(/\n+/)

      .map(l => l.trim())

      .filter(l => l.length > 5);


    if (rawLines.length >= 2) {

      const sceneCount = Math.min(6, Math.max(3, rawLines.length));

      blueprints = rawLines.slice(0, sceneCount).map((line, idx) => {

        const isFirst = idx === 0;

        const isLast = idx === sceneCount - 1;

        const sceneNum = idx + 1;


        return {

          voiceover: line,

          caption: isFirst ? `1. Bilowga: ${cleanTopic}` : isLast ? `Ku Xirnow Xeero AI!` : `${sceneNum}. Qodobka ${sceneNum}`,

          keyMessage: line.length > 60 ? line.slice(0, 58) + '...' : line,

          visualObjective: `Visualizing key point of scene ${sceneNum} for ${cleanTopic}`,

          subject: `Muuqaalka ${sceneNum}: ${cleanTopic}`,

          action: `Falanqeynta qodobka: ${line.slice(0, 40)}`,

          environment: `Goobta tignoolajiyada ee ku habboon mawduuca`,

          cameraComposition: isFirst

            ? 'Macro ground-level POV with dramatic rim lighting'

            : isLast

            ? 'Cinematic centered slow push-in'

            : 'Dynamic 3D system tracking shot',

          visualPrompt: `Cinematic 9:16 vertical visualization illustrating: ${line}`,

          flowPrompt: `Vertical 9:16 cinematic video tracking: ${line}, 24fps smooth motion`,

          visualKeywords: ['xeero ai', cleanTopic.slice(0, 15), `scene ${sceneNum}`],

          visualUrl: undefined,

        };

      });

    }

  }


  // =========================================================================

  // Case 2: Real AI Generation via Gemini (any topic, not limited to the

  // fixed template domains below). Falls through silently to the offline

  // templates if no API key is configured or the call fails for any reason —

  // a reel must always be produced, never a hard error.

  // =========================================================================

  let aiGeneratedTitle: string | undefined;

  if (blueprints.length === 0 && process.env.GEMINI_API_KEY) {

    try {

      const aiResult = await generateScenesWithGemini({

        topic: cleanTopic,

        description,

        targetDuration,

      });

      blueprints = aiResult.scenes;

      aiGeneratedTitle = aiResult.title;

      console.log(`[ScriptGenerator] Generated script via Gemini (${blueprints.length} scenes) for topic: "${cleanTopic}"`);

    } catch (err: any) {

      console.warn(`[ScriptGenerator] Gemini generation failed, falling back to offline templates: ${err?.message}`);

    }

  }


  // =========================================================================

  // Case 3: Domain-Aware Blueprint Generation (offline fallback)

  // =========================================================================

  if (blueprints.length === 0) {

    blueprints = generateDomainBlueprints(domain, cleanTopic);

  }


  const baseDuration = Math.round(targetDuration / blueprints.length);


  const finalScenes: GeneratedSceneScript[] = blueprints.map((bp, idx) => ({

    sceneNumber: idx + 1,

    duration: baseDuration,

    voiceover: bp.voiceover,

    caption: bp.caption,

    keyMessage: bp.keyMessage,

    visualObjective: bp.visualObjective,

    subject: bp.subject,

    action: bp.action,

    environment: bp.environment,

    cameraComposition: bp.cameraComposition,

    visualPrompt: bp.visualPrompt,

    flowPrompt: bp.flowPrompt,

    visualKeywords: bp.visualKeywords,

    visualUrl: undefined, // Handed over to resolveSceneVisual for dynamic scene-specific generation

    videoUrl: undefined,

    assetType: 'image',

  }));


  return {

    title: aiGeneratedTitle || topic || 'Xeero AI Reel',

    topic: cleanTopic,

    targetDuration,

    scenes: finalScenes,

  };

}


