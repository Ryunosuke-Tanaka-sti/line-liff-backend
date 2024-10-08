import { Injectable } from '@nestjs/common';
import { LogService } from 'src/store/log/log.service';
import { StoreEnemyService } from 'src/store/store-enemy/store-enemy.service';

import { StoreUserService } from 'src/store/store-user/store-user.service';
import { EnemyType } from 'src/types/enemyType';
import { PromptResultType } from 'src/types/promptType';
import { UserType } from 'src/types/userType';
import { AoaiPromptService } from 'src/utils/aoai-prompt/aoai-prompt.service';

@Injectable()
export class LineService {
  constructor(
    private readonly userStore: StoreUserService,
    private readonly enemyStore: StoreEnemyService,
    private readonly prompt: AoaiPromptService,
    private readonly log: LogService,
  ) {}
  async isExistUser(uid: string) {
    return this.userStore.isExistUser(uid);
  }
  async readUesr(uid: string) {
    return this.userStore.getUser(uid);
  }
  async createUser(uid: string) {
    const user: UserType = {
      uid: uid,
      winCount: 0,
      lossCount: 0,
      hotStreak: 0,
    };
    return this.userStore.createUser(uid, user);
  }

  async getRandamEnemy(): Promise<EnemyType> {
    const enemies = await this.enemyStore.getEnemyList();
    //ランダムに一つ選ぶ
    const enemy = enemies[Math.floor(Math.random() * enemies.length)];
    return enemy;
  }

  async battlePrompt(uid: string, enemyID: string, name: string, prompt: string): Promise<PromptResultType> {
    const { prompt: enemyPrompt } = await this.enemyStore.getEnemy(enemyID);
    console.log('enemyPrompt', enemyPrompt);
    const inputAOAIText = `挑戦者：${name} \n 特徴・武器: ${prompt}`;
    const temp = await this.prompt.battlePrompot(inputAOAIText, enemyPrompt);
    try {
      const result = await this.prompt.jsonFormatConverter(temp);
      this.log.recordLog({
        uid: '',
        userID: uid,
        prompt: inputAOAIText,
        responseMessage: temp,
        hasError: false,
      });
      return result;
    } catch (e) {
      console.log(e);
      this.log.recordLog({
        uid: '',
        userID: uid,
        prompt: inputAOAIText,
        responseMessage: temp,
        hasError: true,
      });
      return {
        winner: 'user',
        combatLogs: [
          {
            round: 1,
            combatLog: 'JSON整形を正しく行うことができませんでした。よって開発者の負けです。',
          },
          {
            round: 2,
            combatLog:
              '弊社の開発者が敗北しました。もし、デバックしてくれたのであれば会場にいるスタッフにこっそり教えてください。',
          },
        ],
      };
    }
  }
  async updateBattleResult(uid: string, winner: 'system' | 'user') {
    const user = await this.userStore.getUser(uid);
    if (winner === 'system') {
      user.lossCount++;
      user.hotStreak = 0;
    } else {
      user.winCount++;
      user.hotStreak++;
    }
    return this.userStore.updateUser(uid, user);
  }

  async createEnemy(name: string, prompt: string, originalContentUrl: string, previewImageUrl: string) {
    const enemy = {
      uid: 'creteするぞ',
      name: name,
      prompt: prompt,
      originalContentUrl: originalContentUrl,
      previewImageUrl: previewImageUrl,
    };
    console.log('enemy', enemy);
    await this.enemyStore.createEnemy(enemy);
    return;
  }
}
