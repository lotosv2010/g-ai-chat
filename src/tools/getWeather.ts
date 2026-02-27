/**
 * 天气查询工具
 * 调用和风天气 API 查询指定城市的实时天气
 */

/**
 * 天气数据结构
 */
export interface WeatherData {
  location: {
    name: string; // 城市名称
    id: string; // 城市ID
    lat: number; // 纬度
    lon: number; // 经度
    adm1: string; // 一级行政区域
    adm2: string; // 二级行政区域
    country: string; // 国家
  };
  now: {
    temp: number; // 实时气温（摄氏度）
    feelsLike: number; // 体感温度（摄氏度）
    text: string; // 天气现象文字
    windDir: string; // 风向
    windScale: string; // 风力等级
    windSpeed: number; // 风速（公里/小时）
    humidity: number; // 相对湿度（%）
    precip: number; // 当前小时累计降水量（毫米）
    pressure: number; // 大气压强（百帕）
    vis: number; // 能见度（公里）
    obsTime: string; // 数据观测时间
    fxLink: string; // 天气预报网页链接
  };
}

/**
 * 天气查询工具配置
 */
export interface GetWeatherOptions {
  location: string; // 城市名称或城市ID，如：北京 或 101010100
}

/**
 * 和风天气 API 响应结构
 */
interface QWeatherResponse {
  code: string; // 状态码，200 表示成功
  updateTime: string;
  fxLink: string;
  now: {
    obsTime: string;
    temp: string;
    feelsLike: string;
    icon: string;
    text: string;
    wind360: string;
    windDir: string;
    windScale: string;
    windSpeed: string;
    humidity: string;
    precip: string;
    pressure: string;
    vis: string;
    cloud: string;
    dew: string;
  };
  refer: {
    sources: string[];
    license: string[];
  };
}

/**
 * 和风天气 Geo v2 地理位置查询响应结构
 * 参考: https://dev.qweather.com/docs/api/geo/city-lookup/
 */
interface QWeatherGeoV2Response {
  code: string; // 状态码，200 表示成功
  refer: {
    sources: string[];
    license: string[];
  };
  location: Array<{
    name: string; // 地区/城市名称
    id: string; // 地区/城市ID
    lat: string; // 地区/城市纬度
    lon: string; // 地区/城市经度
    adm2: string; // 地区/城市的上级行政区划名称
    adm1: string; // 地区/城市所属一级行政区域
    country: string; // 地区/城市所属国家名称
    tz: string; // 地区/城市所在时区
    utcOffset: string; // 地区/城市目前与UTC时间偏移的小时数
    isDst: string; // 地区/城市是否当前处于夏令时。1 表示当前处于夏令时，0 表示当前不是夏令时
    type: string; // 地区/城市的属性
    rank: string; // 地区评分
    fxLink: string; // 该地区的天气预报网页链接
  }>;
}

/**
 * 和风天气配置
 * 使用 Vite 代理解决 CORS 问题
 */
const QWEATHER_CONFIG = {
  apiHost: '/qweather', // 使用 Vite 代理路径
};

/**
 * 根据城市名称获取城市信息
 * 使用和风天气 Geo v2 API
 * @param cityName 城市名称
 * @returns 城市信息，如果未找到返回 null
 */
async function getCityInfo(cityName: string): Promise<{
  name: string;
  id: string;
  lat: number;
  lon: number;
  adm1: string;
  adm2: string;
  country: string;
} | null> {
  try {
    // 使用 Geo v2 API: /geo/v2/city/lookup
    const url = `${QWEATHER_CONFIG.apiHost}/geo/v2/city/lookup?location=${encodeURIComponent(cityName)}`;
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`获取城市信息失败: ${response.status}`);
    }

    const data: QWeatherGeoV2Response = await response.json();

    // 检查响应状态码
    if (data.code === '200' && data.location && data.location.length > 0) {
      const location = data.location[0];
      console.log(`📍 [Get City Info] 找到城市: ${cityName} -> ${location.id} (${location.name})`);
      return {
        name: location.name,
        id: location.id,
        lat: parseFloat(location.lat),
        lon: parseFloat(location.lon),
        adm1: location.adm1,
        adm2: location.adm2,
        country: location.country,
      };
    }

    console.warn(`⚠️ [Get City Info] 未找到城市: ${cityName} (code: ${data.code})`);
    return null;
  } catch (error) {
    console.error('❌ [Get City Info] Error:', error);
    return null;
  }
}

/**
 * 查询指定城市的实时天气
 * @param options 天气查询选项
 * @returns 天气数据，如果查询失败返回 null
 */
export async function getWeatherByCity(options: GetWeatherOptions): Promise<WeatherData | null> {
  const { location } = options;

  try {
    console.log(`🌤️ [Get Weather] 开始查询天气: ${location}`);

    // 判断 location 是否为纯数字（城市ID）
    let cityInfo: Awaited<ReturnType<typeof getCityInfo>> | null = null;

    if (/^\d+$/.test(location)) {
      // 如果是城市ID，需要根据ID查询城市信息
      // 由于Geo v2 API不支持用ID直接查询，我们暂时不支持直接使用ID
      console.warn(`⚠️ [Get Weather] 当前版本暂不支持直接使用城市ID查询，请使用城市名称`);
      return null;
    } else {
      // 根据城市名称获取城市信息
      cityInfo = await getCityInfo(location);
    }

    if (!cityInfo) {
      console.error(`❌ [Get Weather] 未找到城市: ${location}`);
      return null;
    }

    // 查询实时天气
    const weatherUrl = `${QWEATHER_CONFIG.apiHost}/v7/weather/now?location=${cityInfo.id}`;
    const response = await fetch(weatherUrl, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`查询天气失败: ${response.status}`);
    }

    const data: QWeatherResponse = await response.json();

    if (data.code !== '200') {
      throw new Error(`天气API返回错误: ${data.code}`);
    }

    // 转换为统一格式
    const weatherData: WeatherData = {
      location: cityInfo,
      now: {
        temp: parseFloat(data.now.temp),
        feelsLike: parseFloat(data.now.feelsLike),
        text: data.now.text,
        windDir: data.now.windDir,
        windScale: data.now.windScale,
        windSpeed: parseFloat(data.now.windSpeed),
        humidity: parseFloat(data.now.humidity),
        precip: parseFloat(data.now.precip),
        pressure: parseFloat(data.now.pressure),
        vis: parseFloat(data.now.vis),
        obsTime: data.now.obsTime,
        fxLink: data.fxLink,
      },
    };

    console.log('✅ [Get Weather] 查询成功:', weatherData);
    return weatherData;
  } catch (error) {
    console.error('❌ [Get Weather] Error:', error);
    return null;
  }
}
