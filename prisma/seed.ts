import { createHash } from 'node:crypto';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const presetAgentNames = [
  '小说分析智能体',
  '角色画像智能体',
  '场景拆解智能体',
  '分镜脚本智能体',
  '素材生成规划智能体',
  '素材包整理智能体'
];

function passwordHash(password: string) {
  return `sha256:${createHash('sha256').update(password).digest('hex')}`;
}

function agentConfig(name: string, outputKey: string) {
  return {
    systemPrompt: `你是${name}。请围绕小说/故事生成视频素材包流程输出严格 JSON。`,
    provider: {
      type: 'openai-compatible',
      providerConfigId: 'provider_default',
      apiKeyRef: 'PROVIDER_KEY_DEFAULT',
      modelId: process.env.OPENAI_COMPATIBLE_MODEL_ID ?? 'gpt-4.1-mini'
    },
    runtimeParams: {
      temperature: 0.7,
      maxTokens: 4096,
      responseFormat: 'json'
    },
    inputSchema: {
      type: 'object',
      required: ['text'],
      properties: {
        text: { type: 'string' }
      }
    },
    outputSchema: {
      type: 'object',
      required: [outputKey],
      properties: {
        [outputKey]: { type: 'object' }
      }
    },
    tools: [],
    skills: []
  };
}

function buildTemplateSnapshot() {
  const agents = presetAgentNames.map((name, index) => {
    const outputKey = [
      'novel_analysis',
      'character_profiles',
      'scene_breakdown',
      'storyboard_script',
      'asset_generation_plan',
      'export_package_plan'
    ][index];

    return {
      key: `agent_${index + 1}`,
      name,
      description: `内置${name}`,
      draftConfig: agentConfig(name, outputKey),
      versionName: 'v1',
      outputKey
    };
  });

  return {
    templateKey: 'system_novel_video_assets',
    agents,
    workflow: {
      name: '小说/故事生成视频素材包默认流程',
      description: '从故事文本到结构化视频制作素材包的六步线性工作流',
      nodes: agents.map((agent, index) => ({
        key: `node_${index + 1}`,
        name: agent.name.replace('智能体', ''),
        type: 'agent',
        agentKey: agent.key,
        orderIndex: index + 1,
        position: { x: 120 + index * 260, y: 160 },
        inputMapping:
          index === 0
            ? { source: 'workflow_input', path: '$.text', target: 'text' }
            : {
                source: 'node_output',
                nodeOutputKey: agents[index - 1].outputKey,
                path: '$',
                target: 'text'
              },
        outputKey: agent.outputKey,
        allowManualEdit: true,
        failurePolicy: 'stop',
        enabled: true
      }))
    },
    publishedAppDraft: {
      name: '小说视频素材生成器',
      description: '输入故事，生成视频制作素材规划包',
      publicInputSchema: {
        type: 'object',
        required: ['text'],
        properties: {
          text: { type: 'string' },
          style: { type: 'string' },
          aspectRatio: { type: 'string' }
        }
      },
      publicParams: {
        styleOptions: ['悬疑', '奇幻', '都市', '治愈'],
        aspectRatioOptions: ['16:9', '9:16', '1:1']
      }
    }
  };
}

async function main() {
  const organization = await prisma.organization.upsert({
    where: { id: 'org_default' },
    update: { name: 'Default Organization' },
    create: { id: 'org_default', name: 'Default Organization' }
  });

  await prisma.user.upsert({
    where: { email: 'admin@example.com' },
    update: {
      organizationId: organization.id,
      name: 'Admin',
      role: 'admin'
    },
    create: {
      organizationId: organization.id,
      email: 'admin@example.com',
      passwordHash: passwordHash('password'),
      name: 'Admin',
      role: 'admin'
    }
  });

  await prisma.providerConfig.upsert({
    where: { id: 'provider_default' },
    update: {
      organizationId: organization.id,
      name: 'Default OpenAI-compatible Provider',
      type: 'openai-compatible',
      baseUrl: process.env.OPENAI_COMPATIBLE_BASE_URL ?? 'https://api.openai.com/v1',
      apiKeyRef: 'PROVIDER_KEY_DEFAULT'
    },
    create: {
      id: 'provider_default',
      organizationId: organization.id,
      name: 'Default OpenAI-compatible Provider',
      type: 'openai-compatible',
      baseUrl: process.env.OPENAI_COMPATIBLE_BASE_URL ?? 'https://api.openai.com/v1',
      apiKeyRef: 'PROVIDER_KEY_DEFAULT'
    }
  });

  const template = await prisma.template.upsert({
    where: { id: 'tpl_novel_video_assets' },
    update: {
      name: '小说/故事生成视频素材包',
      description: '将小说或故事转化为视频制作素材规划包',
      type: 'system',
      status: 'active'
    },
    create: {
      id: 'tpl_novel_video_assets',
      name: '小说/故事生成视频素材包',
      description: '将小说或故事转化为视频制作素材规划包',
      type: 'system',
      status: 'active'
    }
  });

  await prisma.templateVersion.upsert({
    where: { id: 'tplv_novel_video_assets_v1' },
    update: {
      templateId: template.id,
      versionName: 'v1',
      snapshot: buildTemplateSnapshot()
    },
    create: {
      id: 'tplv_novel_video_assets_v1',
      templateId: template.id,
      versionName: 'v1',
      snapshot: buildTemplateSnapshot()
    }
  });
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
