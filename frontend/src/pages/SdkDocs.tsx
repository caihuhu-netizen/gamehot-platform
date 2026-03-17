import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Code, Zap, Shield, BookOpen, ArrowRight, Play, Copy, Check, Send, Users, BarChart3, Download, CheckCircle, XCircle, Loader2, Gamepad2, Wrench, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";

const endpoints = [
  {
    method: 'POST', path: '/api/sdk/events', name: '批量事件上报',
    desc: '游戏客户端批量上报用户行为事件（最多50条/请求）。支持通关、失败、购买、广告观看等事件类型。写入后自动异步聚合到 user_behavior_stats 表',
    params: `events: Array<{
  userId: string       // 用户ID（必填）
  eventType: string    // 事件类型（必填，见下方枚举）
  levelId?: number     // 关卡ID
  levelCode?: string   // 关卡编码
  eventData?: object   // 自定义事件数据
  sessionId?: string   // 会话ID
  clientTimestamp?: number // 客户端时间戳(ms)
}>`,
    response: `{
  "code": "OK",
  "data": {
    "accepted": 48,
    "rejected": 2,
    "errors": [
      { "index": 3, "message": "eventType is required" },
      { "index": 12, "message": "Invalid eventType: UNKNOWN" }
    ]
  }
}`,
    eventTypes: true,
  },
  {
    method: 'POST', path: '/api/sdk/user/register', name: '用户注册/登录',
    desc: '游戏用户首次登录时注册，已存在则更新最后活跃时间。自动初始化 user_behavior_stats 记录',
    params: `userId: string          // 用户ID（必填）
countryCode?: string     // 国家代码，默认 "US"
regionGroupCode?: string // 区域组，默认 "NA"
deviceType?: string      // 设备类型，默认 "ANDROID"
installTime?: number     // 安装时间戳(ms)`,
    response: `{
  "code": "OK",
  "data": {
    "userId": "player_001",
    "isNew": true,
    "gameId": 1
  }
}`,
  },
  {
    method: 'POST', path: '/api/sdk/event', name: '单条事件上报',
    desc: '上报单条用户行为事件（兼容旧版SDK）。新接入建议使用批量接口 /events',
    params: 'userId (required), eventType (required), levelId?, levelCode?, eventData?, sessionId?',
    response: `{ "code": "OK", "data": { "recorded": true } }`,
  },
  {
    method: 'POST', path: '/api/sdk/iap', name: '内购上报',
    desc: '上报用户内购订单，支持订单去重、自动关联用户分层、自动更新用户累计付费金额',
    params: `userId (required), orderId (required), productName (required), amount (required)
paymentType?, productId?, currency?, amountUsd?, platform?,
storeTransactionId?, triggerSource?, sessionId?, levelAtPayment?`,
    response: `{
  "code": "OK",
  "data": {
    "orderId": "order_123456",
    "recorded": true,
    "segmentLayer": 7
  }
}`,
  },
  {
    method: 'GET', path: '/api/sdk/segment', name: '查询用户分层',
    desc: '根据userId查询用户当前分层（Luban 10层体系）、四维评分、预测标签和该层的广告配置',
    params: 'userId (query, required)',
    response: `{
  "code": "OK",
  "data": {
    "layer": 7,
    "layerName": "高活跃付费用户",
    "confidence": "0.85",
    "payScore": "0.78",
    "adScore": "0.45",
    "skillScore": "0.82",
    "churnRisk": "0.12",
    "adConfig": {
      "interstitialAdFirstLevel": 15,
      "interstitialAdFrequency": 5,
      "pushGifts": ["gift_weekly", "gift_vip"]
    },
    "labels": {
      "payProbability": "0.72",
      "churnRiskTrend": "STABLE",
      "engagementPhase": "MATURE"
    }
  }
}`,
  },
  {
    method: 'GET', path: '/api/sdk/difficulty', name: '获取难度配置',
    desc: '根据用户分层返回差异化的难度系数、失败恢复策略、道具加成等配置',
    params: 'userId (query, required), layerId (query, optional)',
    response: `{
  "code": "OK",
  "data": {
    "layerId": 7,
    "difficultyConfig": {
      "difficultyMultiplier": "0.90",
      "maxConsecutiveFails": 4,
      "failRecoveryReduction": "0.15",
      "hintBudget": 5
    }
  }
}`,
  },
  {
    method: 'POST', path: '/api/sdk/monetize/check', name: '变现触发检查',
    desc: '检查当前时机是否应该触发变现弹窗，返回匹配的规则和该层的行为策略',
    params: 'userId (required), triggerEvent (required)',
    response: `{
  "code": "OK",
  "data": {
    "shouldTrigger": true,
    "layerId": 5,
    "matchedRule": {
      "ruleCode": "FAIL_OFFER_001",
      "popupType": "IAP",
      "dailyLimit": 3,
      "cooldownMinutes": 20
    }
  }
}`,
  },
  {
    method: 'POST', path: '/api/sdk/segment/compute', name: '计算用户分层',
    desc: '根据用户行为数据实时计算应属于哪一层（基于Luban计算表的升降层规则）',
    params: 'userId, purchaseAmount, streakLoginTimes, totalLoginTimes, onlineDuration, avgDailyOnlineTime, completeLevelNum, avgDailyCompleteLevelNum',
    response: `{
  "code": "OK",
  "data": {
    "layer": 8,
    "type": "upgrade",
    "ruleId": 3,
    "layerName": "中度付费用户"
  }
}`,
  },
  {
    method: 'GET', path: '/api/sdk/config', name: '获取完整配置',
    desc: '一次性获取所有Luban配置（分层逻辑、行为策略、计算规则、难度映射），适合客户端缓存',
    params: '无',
    response: `{
  "code": "OK",
  "data": {
    "logic": [...],
    "behavior": [...],
    "calc": [...],
    "difficultyMapping": [...]
  }
}`,
  },
  {
    method: 'GET', path: '/api/sdk/experiment', name: '获取实验分组',
    desc: '查询用户当前参与的A/B实验及分组信息',
    params: 'userId (query, required)',
    response: `{
  "code": "OK",
  "data": {
    "assignments": [
      { "experimentId": 1, "experimentCode": "EXP_AD_FREQ", "variantId": 2 }
    ]
  }
}`,
  },
];

const EVENT_TYPES = [
  { type: 'SESSION_START', desc: '会话开始', category: '会话' },
  { type: 'SESSION_END', desc: '会话结束', category: '会话' },
  { type: 'LEVEL_START', desc: '开始关卡', category: '关卡' },
  { type: 'LEVEL_PASS', desc: '通过关卡', category: '关卡' },
  { type: 'LEVEL_FAIL', desc: '关卡失败', category: '关卡' },
  { type: 'LEVEL_STUCK', desc: '关卡卡关', category: '关卡' },
  { type: 'AD_SHOWN', desc: '广告展示', category: '广告' },
  { type: 'AD_CLICKED', desc: '广告点击', category: '广告' },
  { type: 'AD_SKIPPED', desc: '广告跳过', category: '广告' },
  { type: 'AD_COMPLETED', desc: '广告看完', category: '广告' },
  { type: 'IAP_SHOWN', desc: '内购展示', category: '付费' },
  { type: 'IAP_PURCHASED', desc: '内购完成', category: '付费' },
  { type: 'IAP_DISMISSED', desc: '内购关闭', category: '付费' },
  { type: 'HINT_USED', desc: '使用提示', category: '道具' },
  { type: 'ITEM_USED', desc: '使用道具', category: '道具' },
  { type: 'ITEM_PURCHASED', desc: '购买道具', category: '道具' },
  { type: 'TUTORIAL_START', desc: '教程开始', category: '教程' },
  { type: 'TUTORIAL_COMPLETE', desc: '教程完成', category: '教程' },
  { type: 'TUTORIAL_SKIP', desc: '跳过教程', category: '教程' },
  { type: 'PUSH_RECEIVED', desc: '推送到达', category: '推送' },
  { type: 'PUSH_CLICKED', desc: '推送点击', category: '推送' },
  { type: 'PUSH_DISMISSED', desc: '推送忽略', category: '推送' },
  { type: 'SHARE', desc: '分享', category: '社交' },
  { type: 'INVITE', desc: '邀请', category: '社交' },
  { type: 'RATE_APP', desc: '评价应用', category: '社交' },
  { type: 'CUSTOM', desc: '自定义事件', category: '自定义' },
];

function ApiTester() {
  const [apiKey, setApiKey] = useState('');
  const [baseUrl, setBaseUrl] = useState(window.location.origin);
  const [method, setMethod] = useState('POST');
  const [path, setPath] = useState('/api/sdk/events');
  const [body, setBody] = useState(JSON.stringify({
    events: [
      { userId: "test_player_001", eventType: "SESSION_START", sessionId: "sess_001" },
      { userId: "test_player_001", eventType: "LEVEL_START", levelId: 1, levelCode: "L001", sessionId: "sess_001" },
      { userId: "test_player_001", eventType: "LEVEL_PASS", levelId: 1, levelCode: "L001", eventData: { score: 1200, stars: 3 }, sessionId: "sess_001" },
    ]
  }, null, 2));
  const [response, setResponse] = useState('');
  const [loading, setLoading] = useState(false);

  const presets = [
    {
      name: '批量事件上报',
      method: 'POST',
      path: '/api/sdk/events',
      body: {
        events: [
          { userId: "test_player_001", eventType: "SESSION_START", sessionId: "sess_001" },
          { userId: "test_player_001", eventType: "LEVEL_START", levelId: 1, levelCode: "L001", sessionId: "sess_001" },
          { userId: "test_player_001", eventType: "LEVEL_PASS", levelId: 1, levelCode: "L001", eventData: { score: 1200, stars: 3 }, sessionId: "sess_001" },
        ]
      },
    },
    {
      name: '用户注册',
      method: 'POST',
      path: '/api/sdk/user/register',
      body: { userId: "test_player_001", countryCode: "CN", deviceType: "IOS" },
    },
    {
      name: '查询分层',
      method: 'GET',
      path: '/api/sdk/segment?userId=test_player_001',
      body: null,
    },
    {
      name: '内购上报',
      method: 'POST',
      path: '/api/sdk/iap',
      body: {
        userId: "test_player_001",
        orderId: `order_${Date.now()}`,
        productName: "钻石礼包",
        amount: 6.99,
        currency: "USD",
        platform: "IOS",
      },
    },
    {
      name: '获取难度',
      method: 'GET',
      path: '/api/sdk/difficulty?userId=test_player_001',
      body: null,
    },
    {
      name: '变现检查',
      method: 'POST',
      path: '/api/sdk/monetize/check',
      body: { userId: "test_player_001", triggerEvent: "LEVEL_FAIL" },
    },
  ];

  async function sendRequest() {
    if (!apiKey) {
      toast.error("请输入 API Key");
      return;
    }
    setLoading(true);
    setResponse('');
    try {
      const url = `${baseUrl}${path}`;
      const options: RequestInit = {
        method,
        headers: {
          'X-API-Key': apiKey,
          'Content-Type': 'application/json',
        },
      };
      if (method === 'POST' && body) {
        options.body = body;
      }
      const res = await fetch(url, options);
      const data = await res.json();
      setResponse(JSON.stringify(data, null, 2));
    } catch (err: unknown) {
      setResponse(`Error: ${(err as Error).message}`);
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <Play className="w-5 h-5 text-emerald-500" />
          API 测试工具
        </CardTitle>
        <CardDescription>在线测试 SDK API 接口，验证数据接入是否正常</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1 block">API Key</label>
            <Input
              placeholder="gk_your_api_key_here"
              value={apiKey}
              onChange={e => setApiKey(e.target.value)}
              className="font-mono text-sm"
            />
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1 block">Base URL</label>
            <Input
              value={baseUrl}
              onChange={e => setBaseUrl(e.target.value)}
              className="font-mono text-sm"
            />
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          {presets.map((p, i) => (
            <Button
              key={i}
              variant="outline"
              size="sm"
              className="text-xs"
              onClick={() => {
                setMethod(p.method);
                setPath(p.path);
                setBody(p.body ? JSON.stringify(p.body, null, 2) : '');
              }}
            >
              {p.name}
            </Button>
          ))}
        </div>

        <div className="flex gap-2 items-center">
          <Badge className={method === 'GET' ? 'bg-emerald-100 text-emerald-700' : 'bg-blue-100 text-blue-700'}>
            {method}
          </Badge>
          <Input
            value={path}
            onChange={e => setPath(e.target.value)}
            className="font-mono text-sm flex-1"
          />
          <Button onClick={sendRequest} disabled={loading} className="gap-1">
            <Send className="w-4 h-4" />
            {loading ? '发送中...' : '发送'}
          </Button>
        </div>

        {method === 'POST' && (
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1 block">Request Body (JSON)</label>
            <Textarea
              value={body}
              onChange={e => setBody(e.target.value)}
              className="font-mono text-xs min-h-[120px]"
              rows={8}
            />
          </div>
        )}

        {response && (
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1 block">Response</label>
            <pre className="bg-slate-900 text-emerald-400 rounded-lg p-4 text-xs font-mono overflow-auto max-h-60">
              {response}
            </pre>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <Button
      variant="ghost"
      size="sm"
      className="h-6 w-6 p-0"
      onClick={() => {
        navigator.clipboard.writeText(text);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      }}
    >
      {copied ? <Check className="w-3 h-3 text-emerald-500" /> : <Copy className="w-3 h-3" />}
    </Button>
  );
}

// ==================== SDK Integration Guide ====================

const UNITY_SDK_FULL = `using System;
using System.Collections;
using System.Collections.Generic;
using System.Text;
using UnityEngine;
using UnityEngine.Networking;

namespace GameHot.SDK
{
    // ============================================================
    //  数据模型
    // ============================================================
    
    [Serializable]
    public class EventPayload
    {
        public string userId;
        public string eventType;
        public int? levelId;
        public string levelCode;
        public string sessionId;
        public long clientTimestamp;
        public Dictionary<string, object> eventData;
    }

    [Serializable]
    public class UserRegisterPayload
    {
        public string userId;
        public string countryCode;
        public string regionGroupCode;
        public string deviceType;
        public long installTime;
    }

    [Serializable]
    public class IAPPayload
    {
        public string userId;
        public string orderId;
        public string productName;
        public float amount;
        public string currency;
        public string platform;
        public string storeTransactionId;
        public string triggerSource;
        public string sessionId;
        public int? levelAtPayment;
    }

    [Serializable]
    public class SegmentResult
    {
        public int layer;
        public string layerName;
        public float confidence;
        public float payScore;
        public float adScore;
        public float skillScore;
        public float churnRisk;
    }

    [Serializable]
    public class DifficultyConfig
    {
        public float difficultyMultiplier;
        public int maxConsecutiveFails;
        public float failRecoveryReduction;
        public int hintBudget;
    }

    [Serializable]
    public class MonetizeCheckResult
    {
        public bool shouldTrigger;
        public int layerId;
        public string ruleCode;
        public string popupType;
        public int dailyLimit;
        public int cooldownMinutes;
    }

    // ============================================================
    //  核心 SDK 类
    // ============================================================

    public class GameHotSDK : MonoBehaviour
    {
        // --- 单例 ---
        private static GameHotSDK _instance;
        public static GameHotSDK Instance
        {
            get
            {
                if (_instance == null)
                {
                    var go = new GameObject("[GameHotSDK]");
                    _instance = go.AddComponent<GameHotSDK>();
                    DontDestroyOnLoad(go);
                }
                return _instance;
            }
        }

        // --- 配置 ---
        private string _apiKey;
        private string _baseUrl;
        private string _userId;
        private string _sessionId;
        private bool _initialized;

        // --- 事件缓冲 ---
        private readonly List<EventPayload> _eventBuffer = new();
        private const int FLUSH_THRESHOLD = 10;
        private const float FLUSH_INTERVAL = 30f; // 秒
        private float _lastFlushTime;

        // --- 缓存 ---
        private SegmentResult _cachedSegment;
        private DifficultyConfig _cachedDifficulty;
        private float _segmentCacheTime;
        private const float SEGMENT_CACHE_TTL = 300f; // 5分钟

        /// <summary>
        /// 初始化 SDK（游戏启动时调用一次）
        /// </summary>
        public void Init(string apiKey, string baseUrl)
        {
            _apiKey = apiKey;
            _baseUrl = baseUrl.TrimEnd('/');
            _sessionId = Guid.NewGuid().ToString("N").Substring(0, 16);
            _initialized = true;
            _lastFlushTime = Time.realtimeSinceStartup;
            Debug.Log($"[GameHotSDK] Initialized. Base URL: {_baseUrl}");
        }

        /// <summary>
        /// 设置当前用户ID（登录后调用）
        /// </summary>
        public void SetUserId(string userId) => _userId = userId;

        void Update()
        {
            if (!_initialized) return;
            // 定时自动 flush
            if (Time.realtimeSinceStartup - _lastFlushTime >= FLUSH_INTERVAL
                && _eventBuffer.Count > 0)
            {
                FlushEvents();
            }
        }

        void OnApplicationPause(bool pause)
        {
            if (pause && _eventBuffer.Count > 0) FlushEvents();
        }

        void OnApplicationQuit()
        {
            if (_eventBuffer.Count > 0) FlushEvents();
        }

        // ========================================================
        //  用户注册/登录
        // ========================================================

        public void RegisterUser(
            string userId,
            string countryCode = "US",
            string deviceType = "ANDROID",
            Action<bool, bool> onComplete = null)
        {
            _userId = userId;
            var payload = new UserRegisterPayload
            {
                userId = userId,
                countryCode = countryCode,
                deviceType = deviceType,
                installTime = DateTimeOffset.UtcNow.ToUnixTimeMilliseconds()
            };
            StartCoroutine(PostRequest("/api/sdk/user/register",
                JsonUtility.ToJson(payload), (success, json) =>
                {
                    bool isNew = json?.Contains("\"isNew\":true") ?? false;
                    onComplete?.Invoke(success, isNew);
                }));
        }

        // ========================================================
        //  事件上报（自动缓冲 + 批量发送）
        // ========================================================

        public void TrackEvent(
            string eventType,
            int? levelId = null,
            string levelCode = null,
            Dictionary<string, object> eventData = null)
        {
            if (string.IsNullOrEmpty(_userId))
            {
                Debug.LogWarning("[GameHotSDK] userId not set. Call SetUserId first.");
                return;
            }
            _eventBuffer.Add(new EventPayload
            {
                userId = _userId,
                eventType = eventType,
                levelId = levelId,
                levelCode = levelCode,
                sessionId = _sessionId,
                clientTimestamp = DateTimeOffset.UtcNow.ToUnixTimeMilliseconds(),
                eventData = eventData
            });
            if (_eventBuffer.Count >= FLUSH_THRESHOLD) FlushEvents();
        }

        /// <summary>立即发送缓冲区中的所有事件</summary>
        public void FlushEvents()
        {
            if (_eventBuffer.Count == 0) return;
            var batch = new List<EventPayload>(_eventBuffer);
            _eventBuffer.Clear();
            _lastFlushTime = Time.realtimeSinceStartup;

            var json = "{\"events\":" + ToJsonArray(batch) + "}";
            StartCoroutine(PostRequest("/api/sdk/events", json, (ok, resp) =>
            {
                if (!ok)
                {
                    Debug.LogWarning($"[GameHotSDK] Event flush failed. Re-queuing {batch.Count} events.");
                    _eventBuffer.InsertRange(0, batch); // 失败重入队列
                }
            }));
        }

        // ========================================================
        //  内购上报
        // ========================================================

        public void ReportIAP(
            string orderId, string productName, float amount,
            string currency = "USD", string platform = null,
            Action<bool> onComplete = null)
        {
            var payload = new IAPPayload
            {
                userId = _userId,
                orderId = orderId,
                productName = productName,
                amount = amount,
                currency = currency,
                platform = platform ?? Application.platform.ToString(),
                sessionId = _sessionId
            };
            StartCoroutine(PostRequest("/api/sdk/iap",
                JsonUtility.ToJson(payload), (ok, _) => onComplete?.Invoke(ok)));
        }

        // ========================================================
        //  查询用户分层（带本地缓存）
        // ========================================================

        public void GetSegment(Action<SegmentResult> onResult)
        {
            if (_cachedSegment != null
                && Time.realtimeSinceStartup - _segmentCacheTime < SEGMENT_CACHE_TTL)
            {
                onResult?.Invoke(_cachedSegment);
                return;
            }
            StartCoroutine(GetRequest(
                $"/api/sdk/segment?userId={_userId}", (ok, json) =>
                {
                    if (ok)
                    {
                        _cachedSegment = JsonUtility.FromJson<SegmentResult>(json);
                        _segmentCacheTime = Time.realtimeSinceStartup;
                    }
                    onResult?.Invoke(_cachedSegment);
                }));
        }

        // ========================================================
        //  获取难度配置
        // ========================================================

        public void GetDifficulty(Action<DifficultyConfig> onResult)
        {
            StartCoroutine(GetRequest(
                $"/api/sdk/difficulty?userId={_userId}", (ok, json) =>
                {
                    if (ok)
                        _cachedDifficulty = JsonUtility.FromJson<DifficultyConfig>(json);
                    onResult?.Invoke(_cachedDifficulty);
                }));
        }

        // ========================================================
        //  变现触发检查
        // ========================================================

        public void CheckMonetize(
            string triggerEvent,
            Action<MonetizeCheckResult> onResult)
        {
            var json = $"{{\"userId\":\"{_userId}\",\"triggerEvent\":\"{triggerEvent}\"}}";
            StartCoroutine(PostRequest("/api/sdk/monetize/check", json,
                (ok, resp) =>
                {
                    MonetizeCheckResult result = null;
                    if (ok) result = JsonUtility.FromJson<MonetizeCheckResult>(resp);
                    onResult?.Invoke(result);
                }));
        }

        // ========================================================
        //  便捷事件方法
        // ========================================================

        public void TrackSessionStart() => TrackEvent("SESSION_START");
        public void TrackSessionEnd() => TrackEvent("SESSION_END");
        public void TrackLevelStart(int levelId, string code = null)
            => TrackEvent("LEVEL_START", levelId, code);
        public void TrackLevelPass(int levelId, string code = null, int? score = null, int? stars = null)
            => TrackEvent("LEVEL_PASS", levelId, code,
                new Dictionary<string, object> { ["score"] = score, ["stars"] = stars });
        public void TrackLevelFail(int levelId, string code = null)
            => TrackEvent("LEVEL_FAIL", levelId, code);
        public void TrackAdShown(string adType)
            => TrackEvent("AD_SHOWN", eventData: new Dictionary<string, object> { ["adType"] = adType });
        public void TrackAdCompleted(string adType)
            => TrackEvent("AD_COMPLETED", eventData: new Dictionary<string, object> { ["adType"] = adType });

        // ========================================================
        //  HTTP 工具
        // ========================================================

        private IEnumerator PostRequest(string path, string body, Action<bool, string> callback)
        {
            var req = new UnityWebRequest(_baseUrl + path, "POST");
            req.SetRequestHeader("X-API-Key", _apiKey);
            req.SetRequestHeader("Content-Type", "application/json");
            req.uploadHandler = new UploadHandlerRaw(Encoding.UTF8.GetBytes(body));
            req.downloadHandler = new DownloadHandlerBuffer();
            req.timeout = 10;
            yield return req.SendWebRequest();
            bool ok = req.result == UnityWebRequest.Result.Success;
            callback?.Invoke(ok, ok ? req.downloadHandler.text : null);
            if (!ok) Debug.LogWarning($"[GameHotSDK] POST {path} failed: {req.error}");
        }

        private IEnumerator GetRequest(string path, Action<bool, string> callback)
        {
            var req = UnityWebRequest.Get(_baseUrl + path);
            req.SetRequestHeader("X-API-Key", _apiKey);
            req.timeout = 10;
            yield return req.SendWebRequest();
            bool ok = req.result == UnityWebRequest.Result.Success;
            callback?.Invoke(ok, ok ? req.downloadHandler.text : null);
            if (!ok) Debug.LogWarning($"[GameHotSDK] GET {path} failed: {req.error}");
        }

        private string ToJsonArray(List<EventPayload> list)
        {
            var sb = new StringBuilder("[");
            for (int i = 0; i < list.Count; i++)
            {
                if (i > 0) sb.Append(",");
                sb.Append(JsonUtility.ToJson(list[i]));
            }
            sb.Append("]");
            return sb.ToString();
        }
    }
}`;

const UNITY_USAGE = `// ============================================================
//  GameManager.cs — 在游戏入口场景中挂载
// ============================================================
using UnityEngine;
using GameHot.SDK;

public class GameManager : MonoBehaviour
{
    [Header("GameHot SDK 配置")]
    [SerializeField] private string apiKey = "gk_your_api_key";
    [SerializeField] private string baseUrl = "https://your-domain.com";

    void Awake()
    {
        // 1. 初始化 SDK
        GameHotSDK.Instance.Init(apiKey, baseUrl);
    }

    public void OnPlayerLogin(string playerId)
    {
        // 2. 注册/登录用户
        GameHotSDK.Instance.RegisterUser(playerId, "CN", "IOS",
            (success, isNew) =>
            {
                Debug.Log(isNew ? "新用户注册成功" : "老用户登录成功");
                // 3. 开始会话
                GameHotSDK.Instance.TrackSessionStart();
                // 4. 获取用户分层和难度配置
                GameHotSDK.Instance.GetSegment(seg =>
                {
                    Debug.Log($"用户分层: L{seg.layer} - {seg.layerName}");
                });
                GameHotSDK.Instance.GetDifficulty(diff =>
                {
                    Debug.Log($"难度系数: {diff.difficultyMultiplier}");
                    // 应用到游戏逻辑...
                });
            });
    }
}

// ============================================================
//  LevelManager.cs — 关卡管理
// ============================================================
using UnityEngine;
using GameHot.SDK;

public class LevelManager : MonoBehaviour
{
    public void OnLevelStart(int levelId, string levelCode)
    {
        GameHotSDK.Instance.TrackLevelStart(levelId, levelCode);
    }

    public void OnLevelPass(int levelId, string levelCode, int score, int stars)
    {
        GameHotSDK.Instance.TrackLevelPass(levelId, levelCode, score, stars);
        
        // 通关后检查是否触发变现弹窗
        GameHotSDK.Instance.CheckMonetize("LEVEL_PASS", result =>
        {
            if (result != null && result.shouldTrigger)
            {
                Debug.Log($"触发变现: {result.popupType} - {result.ruleCode}");
                ShowMonetizePopup(result.popupType);
            }
        });
    }

    public void OnLevelFail(int levelId, string levelCode)
    {
        GameHotSDK.Instance.TrackLevelFail(levelId, levelCode);
        
        // 失败后检查是否触发付费弹窗
        GameHotSDK.Instance.CheckMonetize("LEVEL_FAIL", result =>
        {
            if (result != null && result.shouldTrigger)
            {
                ShowMonetizePopup(result.popupType);
            }
        });
    }

    public void OnPurchaseComplete(string orderId, string product, float amount)
    {
        GameHotSDK.Instance.ReportIAP(orderId, product, amount, "USD");
    }

    private void ShowMonetizePopup(string type)
    {
        // 根据 type (IAP/AD/GIFT) 显示对应弹窗
    }
}`;

const COCOS_SDK_FULL = `/**
 * GameHot SDK for Cocos Creator (TypeScript)
 * 文件: assets/scripts/sdk/GameHotSDK.ts
 */

import { _decorator, sys, game, Game } from 'cc';

// ============================================================
//  类型定义
// ============================================================

export interface EventPayload {
    userId: string;
    eventType: string;
    levelId?: number;
    levelCode?: string;
    sessionId?: string;
    clientTimestamp?: number;
    eventData?: Record<string, unknown>;
}

export interface SegmentResult {
    layer: number;
    layerName: string;
    confidence: number;
    payScore: number;
    adScore: number;
    skillScore: number;
    churnRisk: number;
    adConfig?: {
        interstitialAdFirstLevel: number;
        interstitialAdFrequency: number;
        pushGifts: string[];
    };
}

export interface DifficultyConfig {
    difficultyMultiplier: number;
    maxConsecutiveFails: number;
    failRecoveryReduction: number;
    hintBudget: number;
}

export interface MonetizeCheckResult {
    shouldTrigger: boolean;
    layerId: number;
    matchedRule?: {
        ruleCode: string;
        popupType: string;
        dailyLimit: number;
        cooldownMinutes: number;
    };
}

export interface IAPPayload {
    userId: string;
    orderId: string;
    productName: string;
    amount: number;
    currency?: string;
    platform?: string;
    storeTransactionId?: string;
}

interface ApiResponse<T = any> {
    code: string;
    data?: T;
    error?: string;
}

// ============================================================
//  核心 SDK 类
// ============================================================

export class GameHotSDK {
    private static _instance: GameHotSDK;
    static get instance(): GameHotSDK {
        if (!this._instance) this._instance = new GameHotSDK();
        return this._instance;
    }

    private apiKey = '';
    private baseUrl = '';
    private userId = '';
    private sessionId = '';
    private initialized = false;

    // 事件缓冲
    private eventBuffer: EventPayload[] = [];
    private readonly FLUSH_THRESHOLD = 10;
    private readonly FLUSH_INTERVAL = 30_000; // ms
    private flushTimer: number | null = null;

    // 分层缓存
    private cachedSegment: SegmentResult | null = null;
    private segmentCacheTime = 0;
    private readonly SEGMENT_CACHE_TTL = 300_000; // 5min

    /**
     * 初始化 SDK（游戏启动时调用一次）
     */
    init(apiKey: string, baseUrl: string): void {
        this.apiKey = apiKey;
        this.baseUrl = baseUrl.replace(/\\/+$/, '');
        this.sessionId = this.generateId();
        this.initialized = true;

        // 定时 flush
        this.flushTimer = setInterval(() => {
            if (this.eventBuffer.length > 0) this.flushEvents();
        }, this.FLUSH_INTERVAL) as unknown as number;

        // 游戏切后台/退出时 flush
        game.on(Game.EVENT_HIDE, () => this.flushEvents());

        console.log('[GameHotSDK] Initialized:', this.baseUrl);
    }

    /** 设置当前用户ID */
    setUserId(userId: string): void {
        this.userId = userId;
    }

    /** 销毁（可选） */
    destroy(): void {
        if (this.flushTimer) clearInterval(this.flushTimer);
        this.flushEvents();
    }

    // ========================================================
    //  用户注册/登录
    // ========================================================

    async registerUser(
        userId: string,
        countryCode = 'US',
        deviceType = 'ANDROID'
    ): Promise<{ success: boolean; isNew: boolean }> {
        this.userId = userId;
        const resp = await this.post<{ isNew: boolean }>(
            '/api/sdk/user/register',
            {
                userId,
                countryCode,
                deviceType,
                installTime: Date.now(),
            }
        );
        return { success: resp.code === 'OK', isNew: resp.data?.isNew ?? false };
    }

    // ========================================================
    //  事件上报（自动缓冲 + 批量发送）
    // ========================================================

    trackEvent(
        eventType: string,
        levelId?: number,
        levelCode?: string,
        eventData?: Record<string, unknown>
    ): void {
        if (!this.userId) {
            console.warn('[GameHotSDK] userId not set.');
            return;
        }
        this.eventBuffer.push({
            userId: this.userId,
            eventType,
            levelId,
            levelCode,
            sessionId: this.sessionId,
            clientTimestamp: Date.now(),
            eventData,
        });
        if (this.eventBuffer.length >= this.FLUSH_THRESHOLD) {
            this.flushEvents();
        }
    }

    async flushEvents(): Promise<void> {
        if (this.eventBuffer.length === 0) return;
        const batch = [...this.eventBuffer];
        this.eventBuffer = [];
        try {
            await this.post('/api/sdk/events', { events: batch });
        } catch {
            // 失败重入队列
            this.eventBuffer.unshift(...batch);
            console.warn('[GameHotSDK] Flush failed, re-queued', batch.length);
        }
    }

    // ========================================================
    //  内购上报
    // ========================================================

    async reportIAP(payload: Omit<IAPPayload, 'userId'>): Promise<boolean> {
        const resp = await this.post('/api/sdk/iap', {
            ...payload,
            userId: this.userId,
        });
        return resp.code === 'OK';
    }

    // ========================================================
    //  查询用户分层（带缓存）
    // ========================================================

    async getSegment(): Promise<SegmentResult | null> {
        if (
            this.cachedSegment &&
            Date.now() - this.segmentCacheTime < this.SEGMENT_CACHE_TTL
        ) {
            return this.cachedSegment;
        }
        const resp = await this.get<SegmentResult>(
            \`/api/sdk/segment?userId=\${this.userId}\`
        );
        if (resp.code === 'OK' && resp.data) {
            this.cachedSegment = resp.data;
            this.segmentCacheTime = Date.now();
        }
        return this.cachedSegment;
    }

    // ========================================================
    //  获取难度配置
    // ========================================================

    async getDifficulty(): Promise<DifficultyConfig | null> {
        const resp = await this.get<{ difficultyConfig: DifficultyConfig }>(
            \`/api/sdk/difficulty?userId=\${this.userId}\`
        );
        return resp.data?.difficultyConfig ?? null;
    }

    // ========================================================
    //  变现触发检查
    // ========================================================

    async checkMonetize(triggerEvent: string): Promise<MonetizeCheckResult | null> {
        const resp = await this.post<MonetizeCheckResult>(
            '/api/sdk/monetize/check',
            { userId: this.userId, triggerEvent }
        );
        return resp.data ?? null;
    }

    // ========================================================
    //  便捷方法
    // ========================================================

    trackSessionStart() { this.trackEvent('SESSION_START'); }
    trackSessionEnd()   { this.trackEvent('SESSION_END'); }
    trackLevelStart(levelId: number, code?: string) {
        this.trackEvent('LEVEL_START', levelId, code);
    }
    trackLevelPass(levelId: number, code?: string, score?: number, stars?: number) {
        this.trackEvent('LEVEL_PASS', levelId, code, { score, stars });
    }
    trackLevelFail(levelId: number, code?: string) {
        this.trackEvent('LEVEL_FAIL', levelId, code);
    }
    trackAdShown(adType: string) {
        this.trackEvent('AD_SHOWN', undefined, undefined, { adType });
    }
    trackAdCompleted(adType: string) {
        this.trackEvent('AD_COMPLETED', undefined, undefined, { adType });
    }

    // ========================================================
    //  HTTP 工具
    // ========================================================

    private async post<T = any>(path: string, body: any): Promise<ApiResponse<T>> {
        const resp = await fetch(this.baseUrl + path, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-API-Key': this.apiKey,
            },
            body: JSON.stringify(body),
        });
        return resp.json();
    }

    private async get<T = any>(path: string): Promise<ApiResponse<T>> {
        const resp = await fetch(this.baseUrl + path, {
            headers: { 'X-API-Key': this.apiKey },
        });
        return resp.json();
    }

    private generateId(): string {
        return Math.random().toString(36).substring(2, 10)
             + Date.now().toString(36);
    }
}`;

const COCOS_USAGE = `/**
 * GameScene.ts — 在游戏主场景中使用 SDK
 */
import { _decorator, Component } from 'cc';
import { GameHotSDK } from './sdk/GameHotSDK';
const { ccclass } = _decorator;

@ccclass('GameScene')
export class GameScene extends Component {
    start() {
        // 1. 初始化
        GameHotSDK.instance.init('gk_your_api_key', 'https://your-domain.com');
    }

    async onPlayerLogin(playerId: string) {
        // 2. 注册用户
        const { success, isNew } = await GameHotSDK.instance.registerUser(
            playerId, 'CN', 'IOS'
        );
        console.log(isNew ? '新用户' : '老用户');

        // 3. 开始会话
        GameHotSDK.instance.trackSessionStart();

        // 4. 获取分层 & 难度
        const segment = await GameHotSDK.instance.getSegment();
        console.log(\`分层: L\${segment?.layer} - \${segment?.layerName}\`);

        const difficulty = await GameHotSDK.instance.getDifficulty();
        console.log(\`难度系数: \${difficulty?.difficultyMultiplier}\`);
    }

    // 关卡开始
    onLevelStart(levelId: number, code: string) {
        GameHotSDK.instance.trackLevelStart(levelId, code);
    }

    // 关卡通过
    async onLevelPass(levelId: number, code: string, score: number, stars: number) {
        GameHotSDK.instance.trackLevelPass(levelId, code, score, stars);

        // 检查变现触发
        const result = await GameHotSDK.instance.checkMonetize('LEVEL_PASS');
        if (result?.shouldTrigger) {
            console.log(\`触发变现: \${result.matchedRule?.popupType}\`);
            this.showMonetizePopup(result.matchedRule?.popupType || 'AD');
        }
    }

    // 关卡失败
    async onLevelFail(levelId: number, code: string) {
        GameHotSDK.instance.trackLevelFail(levelId, code);

        const result = await GameHotSDK.instance.checkMonetize('LEVEL_FAIL');
        if (result?.shouldTrigger) {
            this.showMonetizePopup(result.matchedRule?.popupType || 'IAP');
        }
    }

    // 内购完成
    async onPurchase(orderId: string, product: string, amount: number) {
        const ok = await GameHotSDK.instance.reportIAP({
            orderId, productName: product, amount, currency: 'USD'
        });
        console.log('内购上报:', ok ? '成功' : '失败');
    }

    private showMonetizePopup(type: string) {
        // 根据 type 显示对应弹窗
    }
}`;

// ==================== Godot SDK Code ====================

const GODOT_SDK_FULL = `# GameHot SDK for Godot 4.x (GDScript)
# File: addons/gamehot_sdk/gamehot_sdk.gd
extends Node
class_name GameHotSDK

signal connection_verified(success: bool, game_name: String)
signal user_registered(success: bool, is_new: bool)
signal segment_received(segment: Dictionary)

var api_key: String = ""
var base_url: String = ""
var user_id: String = ""
var session_id: String = ""
var _initialized: bool = false
var _event_buffer: Array[Dictionary] = []
const FLUSH_THRESHOLD: int = 10
const FLUSH_INTERVAL: float = 30.0
var _flush_timer: float = 0.0
var _cached_segment: Dictionary = {}
var _segment_cache_time: float = 0.0
const SEGMENT_CACHE_TTL: float = 300.0

static var instance: GameHotSDK

func _enter_tree() -> void:
    instance = self

func init_sdk(p_api_key: String, p_base_url: String) -> void:
    api_key = p_api_key
    base_url = p_base_url.rstrip("/")
    session_id = _generate_id()
    _initialized = true

func set_user_id(p_user_id: String) -> void:
    user_id = p_user_id

func _process(delta: float) -> void:
    if not _initialized: return
    _flush_timer += delta
    if _flush_timer >= FLUSH_INTERVAL and _event_buffer.size() > 0:
        flush_events()
        _flush_timer = 0.0

func track_event(event_type: String, level_id: int = -1, level_code: String = "", event_data: Dictionary = {}) -> void:
    if user_id.is_empty():
        push_warning("[GameHotSDK] userId not set.")
        return
    var ev := {"userId": user_id, "eventType": event_type, "sessionId": session_id, "clientTimestamp": int(Time.get_unix_time_from_system() * 1000)}
    if level_id >= 0: ev["levelId"] = level_id
    if not level_code.is_empty(): ev["levelCode"] = level_code
    if not event_data.is_empty(): ev["eventData"] = event_data
    _event_buffer.append(ev)
    if _event_buffer.size() >= FLUSH_THRESHOLD: flush_events()

func flush_events() -> void:
    if _event_buffer.is_empty(): return
    var batch := _event_buffer.duplicate()
    _event_buffer.clear()
    _flush_timer = 0.0
    _post_request("/api/sdk/events", {"events": batch}, func(s, d): pass)

# Convenience
func track_session_start(): track_event("SESSION_START")
func track_session_end(): track_event("SESSION_END")
func track_level_start(id: int, code: String = ""): track_event("LEVEL_START", id, code)
func track_level_pass(id: int, code: String = "", score: int = 0, stars: int = 0):
    track_event("LEVEL_PASS", id, code, {"score": score, "stars": stars})
func track_level_fail(id: int, code: String = ""): track_event("LEVEL_FAIL", id, code)
func track_ad_shown(ad_type: String): track_event("AD_SHOWN", -1, "", {"adType": ad_type})

func verify_connection() -> void:
    _post_request("/api/sdk/verify", {}, func(success, data):
        connection_verified.emit(success, data.get("gameName", "") if success else ""))

func _post_request(path, body, callback):
    var http := HTTPRequest.new()
    add_child(http)
    var headers := ["Content-Type: application/json", "X-API-Key: " + api_key]
    http.request_completed.connect(func(result, code, _h, body_bytes):
        var ok := result == HTTPRequest.RESULT_SUCCESS and code >= 200 and code < 300
        var data := {}
        if ok:
            var json := JSON.new()
            if json.parse(body_bytes.get_string_from_utf8()) == OK:
                if json.data is Dictionary and json.data.has("data"): data = json.data["data"]
        callback.call(ok, data)
        http.queue_free())
    http.request(base_url + path, headers, HTTPClient.METHOD_POST, JSON.stringify(body))

func _generate_id() -> String:
    var chars := "abcdefghijklmnopqrstuvwxyz0123456789"
    var id := ""
    for i in range(16): id += chars[randi() % chars.length()]
    return id`;

const GODOT_USAGE = `# ============================================================
#  GameHot SDK Godot 接入示例 — GameManager.gd
# ============================================================
extends Node

func _ready():
    # 1. 初始化 SDK（AutoLoad 方式）
    GameHotSDK.instance.init_sdk("gk_your_api_key", "https://your-domain.com")
    
    # 2. 验证连接
    GameHotSDK.instance.connection_verified.connect(_on_connection_verified)
    GameHotSDK.instance.verify_connection()
    
    # 3. 注册用户
    GameHotSDK.instance.set_user_id("player_001")
    GameHotSDK.instance.register_user("player_001", "CN", "ANDROID")
    
    # 4. 开始会话
    GameHotSDK.instance.track_session_start()

func _on_connection_verified(success: bool, game_name: String):
    if success:
        print("SDK connected! Game: ", game_name)
    else:
        print("SDK connection failed!")

func start_level(level_id: int, level_code: String):
    GameHotSDK.instance.track_level_start(level_id, level_code)

func complete_level(level_id: int, level_code: String, score: int, stars: int):
    GameHotSDK.instance.track_level_pass(level_id, level_code, score, stars)

func fail_level(level_id: int, level_code: String):
    GameHotSDK.instance.track_level_fail(level_id, level_code)

func show_ad(ad_type: String):
    GameHotSDK.instance.track_ad_shown(ad_type)

func _notification(what):
    if what == NOTIFICATION_WM_CLOSE_REQUEST:
        GameHotSDK.instance.track_session_end()
        GameHotSDK.instance.flush_events()`;

const UNREAL_SDK_FULL = `// GameHotSDK.h - GameHot SDK for Unreal Engine 5
#pragma once
#include "CoreMinimal.h"
#include "Components/ActorComponent.h"
#include "Http/Public/HttpModule.h"
#include "GameHotSDK.generated.h"

USTRUCT(BlueprintType)
struct FGameHotEvent {
    GENERATED_BODY()
    UPROPERTY(BlueprintReadWrite) FString UserId;
    UPROPERTY(BlueprintReadWrite) FString EventType;
    UPROPERTY(BlueprintReadWrite) int32 LevelId = -1;
    UPROPERTY(BlueprintReadWrite) FString LevelCode;
    UPROPERTY(BlueprintReadWrite) FString SessionId;
    UPROPERTY(BlueprintReadWrite) int64 ClientTimestamp = 0;
    UPROPERTY(BlueprintReadWrite) TMap<FString, FString> EventData;
};

USTRUCT(BlueprintType)
struct FSegmentResult {
    GENERATED_BODY()
    UPROPERTY(BlueprintReadWrite) int32 Layer = 0;
    UPROPERTY(BlueprintReadWrite) FString LayerName;
    UPROPERTY(BlueprintReadWrite) float Confidence = 0.f;
    UPROPERTY(BlueprintReadWrite) float PayScore = 0.f;
    UPROPERTY(BlueprintReadWrite) float ChurnRisk = 0.f;
};

DECLARE_DYNAMIC_MULTICAST_DELEGATE_TwoParams(FOnConnectionVerified, bool, bSuccess, FString, GameName);
DECLARE_DYNAMIC_MULTICAST_DELEGATE_TwoParams(FOnUserRegistered, bool, bSuccess, bool, bIsNew);
DECLARE_DYNAMIC_MULTICAST_DELEGATE_OneParam(FOnSegmentReceived, FSegmentResult, Segment);

UCLASS(ClassGroup=(GameHot), meta=(BlueprintSpawnableComponent))
class UGameHotSDK : public UActorComponent {
    GENERATED_BODY()
public:
    UGameHotSDK();

    UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "GameHot") FString ApiKey;
    UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "GameHot") FString BaseUrl;
    UPROPERTY(BlueprintReadOnly) FString UserId;
    UPROPERTY(BlueprintReadOnly) FString SessionId;
    UPROPERTY(BlueprintReadOnly) bool bInitialized = false;

    UPROPERTY(BlueprintAssignable) FOnConnectionVerified OnConnectionVerified;
    UPROPERTY(BlueprintAssignable) FOnUserRegistered OnUserRegistered;
    UPROPERTY(BlueprintAssignable) FOnSegmentReceived OnSegmentReceived;

    UFUNCTION(BlueprintCallable) void InitSDK(const FString& InApiKey, const FString& InBaseUrl);
    UFUNCTION(BlueprintCallable) void SetUserId(const FString& InUserId);
    UFUNCTION(BlueprintCallable) void RegisterUser(const FString& InUserId, const FString& CountryCode = "US");
    UFUNCTION(BlueprintCallable) void TrackEvent(const FString& EventType, int32 LevelId = -1, const FString& LevelCode = "");
    UFUNCTION(BlueprintCallable) void FlushEvents();
    UFUNCTION(BlueprintCallable) void VerifyConnection();
    UFUNCTION(BlueprintCallable) void TrackSessionStart();
    UFUNCTION(BlueprintCallable) void TrackSessionEnd();
    UFUNCTION(BlueprintCallable) void TrackLevelStart(int32 LevelId, const FString& Code = "");
    UFUNCTION(BlueprintCallable) void TrackLevelPass(int32 LevelId, const FString& Code = "", int32 Score = 0);
    UFUNCTION(BlueprintCallable) void TrackLevelFail(int32 LevelId, const FString& Code = "");

protected:
    virtual void TickComponent(float DeltaTime, ELevelTick TickType, FActorComponentTickFunction* ThisTickFunction) override;
    virtual void EndPlay(const EEndPlayReason::Type EndPlayReason) override;

private:
    TArray<FGameHotEvent> EventBuffer;
    static constexpr int32 FLUSH_THRESHOLD = 10;
    static constexpr float FLUSH_INTERVAL = 30.f;
    float FlushTimer = 0.f;
    void PostRequest(const FString& Path, const TSharedRef<FJsonObject>& Body, TFunction<void(bool, TSharedPtr<FJsonObject>)> Callback);
};

// ============================================================
//  GameHotSDK.cpp (Implementation excerpt)
// ============================================================

void UGameHotSDK::InitSDK(const FString& InApiKey, const FString& InBaseUrl) {
    ApiKey = InApiKey;
    BaseUrl = InBaseUrl;
    SessionId = FGuid::NewGuid().ToString().Left(16);
    bInitialized = true;
    UE_LOG(LogTemp, Log, TEXT("[GameHotSDK] Initialized"));
}

void UGameHotSDK::TrackEvent(const FString& EventType, int32 LevelId, const FString& LevelCode) {
    FGameHotEvent Ev;
    Ev.UserId = UserId; Ev.EventType = EventType;
    Ev.LevelId = LevelId; Ev.LevelCode = LevelCode;
    Ev.SessionId = SessionId;
    Ev.ClientTimestamp = FDateTime::UtcNow().ToUnixTimestamp() * 1000;
    EventBuffer.Add(Ev);
    if (EventBuffer.Num() >= FLUSH_THRESHOLD) FlushEvents();
}

void UGameHotSDK::FlushEvents() {
    if (EventBuffer.Num() == 0) return;
    // Build JSON array and POST to /api/sdk/events
    auto Body = MakeShared<FJsonObject>();
    TArray<TSharedPtr<FJsonValue>> JsonEvents;
    for (const auto& Ev : EventBuffer) {
        auto EvObj = MakeShared<FJsonObject>();
        EvObj->SetStringField("userId", Ev.UserId);
        EvObj->SetStringField("eventType", Ev.EventType);
        EvObj->SetNumberField("clientTimestamp", Ev.ClientTimestamp);
        JsonEvents.Add(MakeShared<FJsonValueObject>(EvObj));
    }
    Body->SetArrayField("events", JsonEvents);
    PostRequest("/api/sdk/events", Body.ToSharedRef(), [](bool, TSharedPtr<FJsonObject>) {});
    EventBuffer.Empty();
}

void UGameHotSDK::VerifyConnection() {
    auto Body = MakeShared<FJsonObject>();
    PostRequest("/api/sdk/verify", Body.ToSharedRef(), [this](bool bOk, TSharedPtr<FJsonObject> Data) {
        FString GameName = Data.IsValid() ? Data->GetStringField("gameName") : "";
        OnConnectionVerified.Broadcast(bOk, GameName);
    });
}`;

const UNREAL_USAGE = `// ============================================================
//  GameHot SDK Unreal 接入示例 — AMyGameMode.cpp
// ============================================================
#include "MyGameMode.h"
#include "GameHotSDK.h"

void AMyGameMode::BeginPlay() {
    Super::BeginPlay();
    
    // 1. 创建 SDK 组件
    auto* SDK = NewObject<UGameHotSDK>(this);
    SDK->RegisterComponent();
    
    // 2. 初始化
    SDK->InitSDK("gk_your_api_key", "https://your-domain.com");
    
    // 3. 绑定回调
    SDK->OnConnectionVerified.AddDynamic(this, &AMyGameMode::OnSDKConnected);
    SDK->OnUserRegistered.AddDynamic(this, &AMyGameMode::OnUserRegistered);
    
    // 4. 验证连接
    SDK->VerifyConnection();
    
    // 5. 注册用户
    SDK->SetUserId("player_001");
    SDK->RegisterUser("player_001", "CN");
    
    // 6. 开始会话
    SDK->TrackSessionStart();
}

void AMyGameMode::OnSDKConnected(bool bSuccess, FString GameName) {
    if (bSuccess)
        UE_LOG(LogTemp, Log, TEXT("SDK connected! Game: %s"), *GameName);
    else
        UE_LOG(LogTemp, Error, TEXT("SDK connection failed!"));
}

void AMyGameMode::StartLevel(int32 LevelId, const FString& Code) {
    SDK->TrackLevelStart(LevelId, Code);
}

void AMyGameMode::CompleteLevel(int32 LevelId, const FString& Code, int32 Score) {
    SDK->TrackLevelPass(LevelId, Code, Score);
}

void AMyGameMode::FailLevel(int32 LevelId, const FString& Code) {
    SDK->TrackLevelFail(LevelId, Code);
}

// Blueprint 方式：直接在 Actor 上添加 GameHotSDK 组件
// 在蓝图中调用 InitSDK / TrackEvent 等节点即可`;

// ==================== SDK Verification Tool ====================

function SdkVerificationTool() {
  const [apiKey, setApiKey] = useState('');
  const [baseUrl, setBaseUrl] = useState(window.location.origin);
  const [verifyResult, setVerifyResult] = useState<any>(null);
  const [verifying, setVerifying] = useState(false);
  const [eventJson, setEventJson] = useState(JSON.stringify({
    events: [{
      userId: 'test_player_001',
      eventType: 'SESSION_START',
      sessionId: 'test_session_001',
      clientTimestamp: Date.now(),
    }]
  }, null, 2));
  const [eventResult, setEventResult] = useState<any>(null);
  const [validating, setValidating] = useState(false);

  const handleVerify = async () => {
    if (!apiKey.trim()) { toast.error('请输入 API Key'); return; }
    setVerifying(true);
    setVerifyResult(null);
    try {
      const resp = await fetch(`${baseUrl}/api/sdk/verify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-API-Key': apiKey },
        body: '{}',
      });
      const data = await resp.json();
      setVerifyResult({ status: resp.status, ...data });
    } catch (err: unknown) {
      setVerifyResult({ status: 0, code: 'NETWORK_ERROR', message: (err as Error).message });
    } finally {
      setVerifying(false);
    }
  };

  const handleValidateEvent = async () => {
    if (!apiKey.trim()) { toast.error('请输入 API Key'); return; }
    setValidating(true);
    setEventResult(null);
    try {
      const body = JSON.parse(eventJson);
      const resp = await fetch(`${baseUrl}/api/sdk/verify/event`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-API-Key': apiKey },
        body: JSON.stringify(body),
      });
      const data = await resp.json();
      setEventResult({ status: resp.status, ...data });
    } catch (err: unknown) {
      setEventResult({ status: 0, code: 'PARSE_ERROR', message: (err as Error).message });
    } finally {
      setValidating(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <Wrench className="w-5 h-5 text-orange-500" />
          SDK 集成验证工具
        </CardTitle>
        <CardDescription>
          验证 API Key 有效性和事件上报格式，无需部署即可测试 SDK 接入是否正确
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Connection Test */}
        <div className="space-y-3">
          <h4 className="text-sm font-semibold flex items-center gap-2">
            <Badge variant="outline">1</Badge> 连接测试
          </h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">API Key</label>
              <Input
                placeholder="gk_xxxxxxxxxxxxxxxx"
                value={apiKey}
                onChange={e => setApiKey(e.target.value)}
                className="font-mono text-sm"
              />
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Base URL</label>
              <Input
                placeholder="https://your-domain.com"
                value={baseUrl}
                onChange={e => setBaseUrl(e.target.value)}
                className="font-mono text-sm"
              />
            </div>
          </div>
          <Button onClick={handleVerify} disabled={verifying} size="sm">
            {verifying ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <Zap className="w-4 h-4 mr-1" />}
            测试连接
          </Button>
          {verifyResult && (
            <div className={`rounded-lg p-3 text-sm ${verifyResult.code === 'OK' ? 'bg-emerald-50 border border-emerald-200 dark:bg-emerald-950/30 dark:border-emerald-800' : 'bg-red-50 border border-red-200 dark:bg-red-950/30 dark:border-red-800'}`}>
              <div className="flex items-center gap-2 mb-2">
                {verifyResult.code === 'OK'
                  ? <CheckCircle className="w-4 h-4 text-emerald-600" />
                  : <XCircle className="w-4 h-4 text-red-600" />}
                <span className="font-semibold">
                  {verifyResult.code === 'OK' ? '连接成功' : `连接失败 (${verifyResult.code})`}
                </span>
              </div>
              {verifyResult.data && (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs">
                  <div><span className="text-muted-foreground">游戏名称:</span> {verifyResult.data.gameName}</div>
                  <div><span className="text-muted-foreground">游戏代码:</span> {verifyResult.data.gameCode}</div>
                  <div><span className="text-muted-foreground">状态:</span> <Badge variant="outline" className="text-[10px]">{verifyResult.data.status}</Badge></div>
                  <div><span className="text-muted-foreground">API版本:</span> {verifyResult.data.apiVersion}</div>
                </div>
              )}
              {verifyResult.message && !verifyResult.data && (
                <p className="text-xs text-muted-foreground">{verifyResult.message}</p>
              )}
            </div>
          )}
        </div>

        {/* Event Validation */}
        <div className="space-y-3">
          <h4 className="text-sm font-semibold flex items-center gap-2">
            <Badge variant="outline">2</Badge> 事件格式验证 <Badge variant="secondary" className="text-[10px]">Dry Run</Badge>
          </h4>
          <p className="text-xs text-muted-foreground">验证事件 JSON 格式是否正确，不会实际写入数据库</p>
          <Textarea
            value={eventJson}
            onChange={e => setEventJson(e.target.value)}
            className="font-mono text-xs min-h-[120px]"
            placeholder='{"events":[{"userId":"...","eventType":"SESSION_START"}]}'
          />
          <Button onClick={handleValidateEvent} disabled={validating} size="sm" variant="outline">
            {validating ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <CheckCircle className="w-4 h-4 mr-1" />}
            验证事件格式
          </Button>
          {eventResult && (
            <div className={`rounded-lg p-3 text-sm ${eventResult.data?.invalidCount === 0 ? 'bg-emerald-50 border border-emerald-200 dark:bg-emerald-950/30 dark:border-emerald-800' : 'bg-amber-50 border border-amber-200 dark:bg-amber-950/30 dark:border-amber-800'}`}>
              {eventResult.data ? (
                <>
                  <div className="flex items-center gap-2 mb-2">
                    {eventResult.data.invalidCount === 0
                      ? <CheckCircle className="w-4 h-4 text-emerald-600" />
                      : <AlertTriangle className="w-4 h-4 text-amber-600" />}
                    <span className="font-semibold">{eventResult.data.message}</span>
                  </div>
                  <div className="flex gap-4 text-xs mb-2">
                    <span>总事件: {eventResult.data.totalEvents}</span>
                    <span className="text-emerald-600">有效: {eventResult.data.validCount}</span>
                    {eventResult.data.invalidCount > 0 && <span className="text-red-600">无效: {eventResult.data.invalidCount}</span>}
                  </div>
                  {eventResult.data.results?.filter((r: any) => !r.valid).map((r: any, i: number) => (
                    <div key={i} className="text-xs text-red-600 bg-red-100/50 dark:bg-red-900/20 rounded px-2 py-1 mt-1">
                      事件[{r.index}] {r.eventType}: {r.errors.join('; ')}
                    </div>
                  ))}
                </>
              ) : (
                <p className="text-xs text-red-600">{eventResult.message || 'Unknown error'}</p>
              )}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

// ==================== SDK Download Button ====================

function SdkDownloadButton({ engine }: { engine: 'unity' | 'cocos' | 'godot' | 'unreal' }) {
  const { data, isLoading } = trpc.sdkDownload.downloadPackage.useQuery({ engine });

  const handleDownload = () => {
    if (!data) return;
    const engineNames: Record<string, string> = { unity: 'Unity', cocos: 'CocosCreator', godot: 'Godot', unreal: 'UnrealEngine' };
    data.files.forEach(file => {
      const blob = new Blob([file.content], { type: 'text/plain' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = file.name;
      a.click();
      URL.revokeObjectURL(url);
    });
    toast.success(`${engineNames[engine]} SDK 文件已开始下载`);
  };

  return (
    <Button size="sm" variant="outline" onClick={handleDownload} disabled={isLoading} className="gap-1">
      <Download className="w-3.5 h-3.5" />
      {isLoading ? '加载中...' : '下载 SDK'}
    </Button>
  );
}

function SdkIntegrationGuide() {
  const [activeEngine, setActiveEngine] = useState<'unity' | 'cocos' | 'godot' | 'unreal'>('unity');
  const [activeTab, setActiveTab] = useState<'sdk' | 'usage'>('sdk');

  const engineConfig: Record<string, { lang: string; sdkCode: string; usageCode: string; sdkFile: string; usageFile: string; icon: string }> = {
    unity: { lang: 'C#', sdkCode: UNITY_SDK_FULL, usageCode: UNITY_USAGE, sdkFile: 'GameHotSDK.cs', usageFile: 'GameManager.cs / LevelManager.cs', icon: '\ud83c\udfae' },
    cocos: { lang: 'TypeScript', sdkCode: COCOS_SDK_FULL, usageCode: COCOS_USAGE, sdkFile: 'GameHotSDK.ts', usageFile: 'GameScene.ts', icon: '\ud83d\udd25' },
    godot: { lang: 'GDScript', sdkCode: GODOT_SDK_FULL, usageCode: GODOT_USAGE, sdkFile: 'gamehot_sdk.gd', usageFile: 'GameManager.gd', icon: '\ud83e\udd16' },
    unreal: { lang: 'C++', sdkCode: UNREAL_SDK_FULL, usageCode: UNREAL_USAGE, sdkFile: 'GameHotSDK.h + .cpp', usageFile: 'AMyGameMode.cpp', icon: '\u2699\ufe0f' },
  };
  const cfg = engineConfig[activeEngine];
  const currentCode = activeTab === 'sdk' ? cfg.sdkCode : cfg.usageCode;
  const currentLang = cfg.lang;
  const currentFile = activeTab === 'sdk' ? cfg.sdkFile : cfg.usageFile;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <Code className="w-5 h-5 text-violet-500" />
          SDK 封装包 — Unity / Cocos / Godot / Unreal
        </CardTitle>
        <CardDescription>
          开箱即用的 SDK 封装，支持事件缓冲、自动批量上报、分层缓存、失败重试、生命周期管理
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Engine Selector */}
        <div className="flex flex-wrap items-center gap-2">
          {[
            { key: 'unity' as const, label: 'Unity (C#)', icon: '\ud83c\udfae' },
            { key: 'cocos' as const, label: 'Cocos Creator (TS)', icon: '\ud83d\udd25' },
            { key: 'godot' as const, label: 'Godot (GDScript)', icon: '\ud83e\udd16' },
            { key: 'unreal' as const, label: 'Unreal (C++)', icon: '\u2699\ufe0f' },
          ].map(eng => (
            <Button
              key={eng.key}
              variant={activeEngine === eng.key ? 'default' : 'outline'}
              size="sm"
              onClick={() => { setActiveEngine(eng.key); setActiveTab('sdk'); }}
            >
              <span className="font-bold mr-1">{eng.icon}</span> {eng.label}
            </Button>
          ))}
        </div>

        {/* Tab Selector */}
        <div className="flex items-center gap-2 border-b pb-2">
          <button
            className={`px-3 py-1.5 text-sm rounded-md transition-colors ${
              activeTab === 'sdk'
                ? 'bg-primary text-primary-foreground'
                : 'text-muted-foreground hover:bg-muted'
            }`}
            onClick={() => setActiveTab('sdk')}
          >
            SDK 封装包
          </button>
          <button
            className={`px-3 py-1.5 text-sm rounded-md transition-colors ${
              activeTab === 'usage'
                ? 'bg-primary text-primary-foreground'
                : 'text-muted-foreground hover:bg-muted'
            }`}
            onClick={() => setActiveTab('usage')}
          >
            接入示例
          </button>
        </div>

        {/* Feature badges */}
        <div className="flex flex-wrap gap-1.5">
          {[
            '单例模式', '事件缓冲', '自动批量上报', '分层缓存',
            '失败重试', '生命周期管理', '便捷方法', 'API Key 认证',
          ].map(f => (
            <Badge key={f} variant="secondary" className="text-[10px]">{f}</Badge>
          ))}
        </div>

        {/* Code block */}
        <div className="bg-slate-900 rounded-lg relative">
          <div className="flex items-center justify-between px-4 py-2 border-b border-slate-700">
            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-400">{currentLang}</span>
              <span className="text-xs text-slate-500">—</span>
              <span className="text-xs text-slate-400 font-mono">{currentFile}</span>
            </div>
            <div className="flex items-center gap-2">
              <CopyButton text={currentCode} />
              <SdkDownloadButton engine={activeEngine} />
            </div>
          </div>
          <pre className="text-xs text-emerald-400 font-mono whitespace-pre overflow-auto max-h-[600px] p-4">
            {currentCode}
          </pre>
        </div>

        {/* Architecture notes */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div className="bg-muted/50 rounded-lg p-3">
            <h4 className="text-sm font-semibold mb-1 flex items-center gap-1">
              <Zap className="w-3.5 h-3.5 text-amber-500" />事件缓冲
            </h4>
            <p className="text-xs text-muted-foreground">
              客户端事件先写入内存缓冲，累计10条或每30秒自动批量上报，减少网络请求次数
            </p>
          </div>
          <div className="bg-muted/50 rounded-lg p-3">
            <h4 className="text-sm font-semibold mb-1 flex items-center gap-1">
              <Shield className="w-3.5 h-3.5 text-blue-500" />分层缓存
            </h4>
            <p className="text-xs text-muted-foreground">
              用户分层结果本地缓存5分钟，避免频繁查询服务端，过期后自动刷新
            </p>
          </div>
          <div className="bg-muted/50 rounded-lg p-3">
            <h4 className="text-sm font-semibold mb-1 flex items-center gap-1">
              <Play className="w-3.5 h-3.5 text-green-500" />生命周期
            </h4>
            <p className="text-xs text-muted-foreground">
              应用切后台/退出时自动 flush 缓冲事件，确保数据不丢失
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default function SdkDocs() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2"><BookOpen className="w-6 h-6" />SDK API 文档</h1>
        <p className="text-muted-foreground mt-1">游戏客户端接入 GAMEHOT CDP 系统的 REST API 参考文档 — 10 个端点覆盖完整数据闭环</p>
      </div>

      {/* Quick Start */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2"><Zap className="w-5 h-5 text-amber-500" />快速接入</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="bg-muted/50 rounded-lg p-4">
              <div className="text-sm font-semibold mb-2 flex items-center gap-1">
                <Badge variant="outline" className="text-[10px]">1</Badge> 获取API密钥
              </div>
              <p className="text-xs text-muted-foreground">在"游戏项目管理"中创建游戏项目，系统自动生成 SDK API Key</p>
            </div>
            <div className="bg-muted/50 rounded-lg p-4">
              <div className="text-sm font-semibold mb-2 flex items-center gap-1">
                <Badge variant="outline" className="text-[10px]">2</Badge> 注册用户
              </div>
              <p className="text-xs text-muted-foreground">用户首次登录时调用 <code className="bg-background px-1 rounded">/user/register</code></p>
            </div>
            <div className="bg-muted/50 rounded-lg p-4">
              <div className="text-sm font-semibold mb-2 flex items-center gap-1">
                <Badge variant="outline" className="text-[10px]">3</Badge> 上报事件
              </div>
              <p className="text-xs text-muted-foreground">使用 <code className="bg-background px-1 rounded">/events</code> 批量上报行为数据</p>
            </div>
            <div className="bg-muted/50 rounded-lg p-4">
              <div className="text-sm font-semibold mb-2 flex items-center gap-1">
                <Badge variant="outline" className="text-[10px]">4</Badge> 查询配置
              </div>
              <p className="text-xs text-muted-foreground">调用分层、难度、变现、实验等接口获取个性化配置</p>
            </div>
          </div>

          <div className="bg-slate-900 rounded-lg p-4 relative">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs text-slate-400">认证示例 (cURL)</span>
              <CopyButton text={`curl -X POST -H "X-API-Key: gk_your_api_key" -H "Content-Type: application/json" -d '{"events":[{"userId":"player_001","eventType":"SESSION_START"}]}' https://your-domain.com/api/sdk/events`} />
            </div>
            <pre className="text-sm text-emerald-400 font-mono whitespace-pre-wrap">{`curl -X POST \\
  -H "X-API-Key: gk_your_api_key" \\
  -H "Content-Type: application/json" \\
  -d '{"events":[{"userId":"player_001","eventType":"SESSION_START"}]}' \\
  https://your-domain.com/api/sdk/events`}</pre>
          </div>
        </CardContent>
      </Card>

      {/* Data Flow */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2"><Shield className="w-5 h-5 text-blue-500" />数据闭环流程</CardTitle>
          <CardDescription>SDK API 按照闭环流程设计，从数据采集到个性化配置下发形成完整闭环</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap items-center gap-2 text-sm">
            {[
              { label: '注册用户', api: '/user/register', color: 'bg-violet-100 text-violet-700', icon: Users },
              { label: '批量上报', api: '/events', color: 'bg-purple-100 text-purple-700', icon: Send },
              { label: '计算分层', api: '/segment/compute', color: 'bg-blue-100 text-blue-700', icon: BarChart3 },
              { label: '查询分层', api: '/segment', color: 'bg-cyan-100 text-cyan-700', icon: Shield },
              { label: '获取难度', api: '/difficulty', color: 'bg-emerald-100 text-emerald-700', icon: Zap },
              { label: '变现检查', api: '/monetize/check', color: 'bg-amber-100 text-amber-700', icon: Code },
              { label: '实验分组', api: '/experiment', color: 'bg-rose-100 text-rose-700', icon: BookOpen },
            ].map((step, i) => (
              <div key={i} className="flex items-center gap-2">
                <Badge className={step.color}>{step.label}</Badge>
                <code className="text-xs text-muted-foreground">{step.api}</code>
                {i < 6 && <ArrowRight className="w-4 h-4 text-muted-foreground" />}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Interactive Tester */}
      <ApiTester />

      {/* Event Types Reference */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">事件类型枚举</CardTitle>
          <CardDescription>POST /api/sdk/events 支持的 eventType 值</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="rounded-lg border overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-muted/50">
                <tr>
                  <th className="px-4 py-2 text-left">类别</th>
                  <th className="px-4 py-2 text-left">eventType</th>
                  <th className="px-4 py-2 text-left">说明</th>
                </tr>
              </thead>
              <tbody>
                {EVENT_TYPES.map(et => (
                  <tr key={et.type} className="border-t">
                    <td className="px-4 py-2"><Badge variant="outline" className="text-[10px]">{et.category}</Badge></td>
                    <td className="px-4 py-2 font-mono text-xs">{et.type}</td>
                    <td className="px-4 py-2 text-muted-foreground">{et.desc}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* API Endpoints */}
      <Tabs defaultValue="0">
        <TabsList className="flex-wrap h-auto gap-1">
          {endpoints.map((ep, i) => (
            <TabsTrigger key={i} value={String(i)} className="text-xs">
              <Badge variant="outline" className="font-mono mr-1 text-[10px]">{ep.method}</Badge>
              {ep.name}
            </TabsTrigger>
          ))}
        </TabsList>
        {endpoints.map((ep, i) => (
          <TabsContent key={i} value={String(i)} className="mt-4">
            <Card>
              <CardHeader>
                <div className="flex items-center gap-3">
                  <Badge className={ep.method === 'GET' ? 'bg-emerald-100 text-emerald-700' : 'bg-blue-100 text-blue-700'}>{ep.method}</Badge>
                  <code className="text-sm font-mono font-semibold">{ep.path}</code>
                </div>
                <CardDescription className="mt-2">{ep.desc}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <h4 className="text-sm font-semibold mb-2">参数</h4>
                  <pre className="bg-muted/50 rounded-lg p-3 text-sm font-mono whitespace-pre-wrap">{ep.params}</pre>
                </div>
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="text-sm font-semibold">响应示例</h4>
                    <CopyButton text={ep.response} />
                  </div>
                  <pre className="bg-slate-900 text-emerald-400 rounded-lg p-4 text-xs font-mono overflow-auto max-h-80">{ep.response}</pre>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        ))}
      </Tabs>

      {/* Error Codes */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">错误码说明</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="rounded-lg border overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-muted/50">
                <tr>
                  <th className="px-4 py-2 text-left">错误码</th>
                  <th className="px-4 py-2 text-left">HTTP状态</th>
                  <th className="px-4 py-2 text-left">说明</th>
                </tr>
              </thead>
              <tbody>
                {[
                  ['SDK_AUTH_MISSING', '401', '请求头缺少 X-API-Key'],
                  ['SDK_AUTH_INVALID', '401', 'API Key 无效或不存在'],
                  ['SDK_GAME_INACTIVE', '403', '游戏项目未激活（PAUSED/ARCHIVED）'],
                  ['MISSING_PARAM', '400', '缺少必要参数'],
                  ['INVALID_EVENTS', '400', 'events 必须是非空数组'],
                  ['BATCH_TOO_LARGE', '400', '批量事件超过50条上限'],
                  ['ALL_EVENTS_INVALID', '400', '批量中所有事件均校验失败'],
                  ['DUPLICATE', '200', '订单已存在（IAP去重）'],
                  ['INTERNAL_ERROR', '500', '服务器内部错误'],
                ].map(([code, status, desc]) => (
                  <tr key={code} className="border-t">
                    <td className="px-4 py-2 font-mono text-xs">{code}</td>
                    <td className="px-4 py-2"><Badge variant="outline">{status}</Badge></td>
                    <td className="px-4 py-2 text-muted-foreground">{desc}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* SDK Integration Verification Tool */}
      <SdkVerificationTool />

      {/* SDK Integration Guide - Full */}
      <SdkIntegrationGuide />
    </div>
  );
}
